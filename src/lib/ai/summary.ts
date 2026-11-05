import { supabaseAdmin } from './admin-client';
import { loadAiConfig } from './config';
import { buildConversationContext } from './context';
import { logAiUsage } from './usage';
import { aiRequestTimeoutMs } from './defaults';
import { generateOpenAi } from './providers/openai';
import { generateAnthropic } from './providers/anthropic';
import { generateOpenAiCompatible } from './providers/openai-compatible';
import { sendConversationSummaryEmail } from '@/lib/email/send';
import type { AiConfig, ChatMessage, ProviderResult } from './types';
import type { ConversationSummaryData } from '@/lib/email/types';

export interface ExtractedConversationSummary {
  overview: string;
  requirements: string[];
  questions: string[];
  preferences: string[];
  decisions: string[];
  finalOutcome: string;
  recommendedNextAction: string;
  sentiment: 'positive' | 'neutral' | 'urgent' | 'negative';
}

const SUMMARY_SYSTEM_PROMPT = `
You are an expert CRM executive analyst. Analyze the following WhatsApp conversation between a customer and the business assistant.
Extract key business details and output ONLY a strictly valid JSON object conforming to the following structure:
{
  "overview": "1-2 sentence high-level executive overview of the conversation",
  "requirements": ["Customer requirement or product sought 1", "Requirement 2"],
  "questions": ["Specific question asked by the customer 1", "Question 2"],
  "preferences": ["Budget, timeline, color, size, or constraint 1"],
  "decisions": ["Agreement or decision reached during the chat 1"],
  "finalOutcome": "Concise final state (e.g., 'Quotation Requested', 'Order Confirmed', 'Awaiting Customer Payment', 'Inquiry Answered', 'Escalated to Staff', 'Lost Lead')",
  "recommendedNextAction": "Actionable next step for the shop owner/manager",
  "sentiment": "positive" | "neutral" | "urgent" | "negative"
}
Rules:
- Output ONLY the raw JSON object. Do not include markdown code blocks, backticks, or preamble.
- Base facts strictly on the conversation transcript; do not hallucinate details.
- If a list has no relevant items, provide an empty array [].
`.trim();

/**
 * Generate a structured conversation summary using the account's existing LLM provider.
 */
export async function generateConversationSummary(args: {
  config: AiConfig;
  messages: ChatMessage[];
  contactName?: string | null;
  contactPhone?: string | null;
}): Promise<ExtractedConversationSummary | null> {
  const { config, messages, contactName, contactPhone } = args;
  if (!messages || messages.length === 0) return null;

  const timeoutMs = aiRequestTimeoutMs();
  const providerArgs = {
    apiKey: config.apiKey,
    model: config.model,
    systemPrompt: SUMMARY_SYSTEM_PROMPT,
    messages: [
      ...messages,
      {
        role: 'user' as const,
        content: `Summarize this conversation for customer ${contactName || 'Customer'} (${contactPhone || 'WhatsApp'}). Return the raw JSON object.`,
      },
    ],
    timeoutMs,
    baseUrl: config.baseUrl,
  };

  let result: ProviderResult;
  try {
    switch (config.provider) {
      case 'openai':
        result = await generateOpenAi(providerArgs);
        break;
      case 'anthropic':
        result = await generateAnthropic(providerArgs);
        break;
      case 'openai_compatible':
        result = await generateOpenAiCompatible(providerArgs);
        break;
      default:
        console.warn(`[AI Summary] Unsupported provider: ${config.provider}`);
        return null;
    }
  } catch (err) {
    console.error('[AI Summary] LLM generation failed:', err);
    return null;
  }

  // Parse structured JSON
  const rawText = result.text.trim();
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<ExtractedConversationSummary>;
    return {
      overview:
        typeof parsed.overview === 'string' && parsed.overview.trim()
          ? parsed.overview.trim()
          : 'Conversation completed with AI agent.',
      requirements: Array.isArray(parsed.requirements)
        ? parsed.requirements.map(String).filter(Boolean)
        : [],
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.map(String).filter(Boolean)
        : [],
      preferences: Array.isArray(parsed.preferences)
        ? parsed.preferences.map(String).filter(Boolean)
        : [],
      decisions: Array.isArray(parsed.decisions)
        ? parsed.decisions.map(String).filter(Boolean)
        : [],
      finalOutcome:
        typeof parsed.finalOutcome === 'string' && parsed.finalOutcome.trim()
          ? parsed.finalOutcome.trim()
          : 'Inquiry Completed',
      recommendedNextAction:
        typeof parsed.recommendedNextAction === 'string' &&
        parsed.recommendedNextAction.trim()
          ? parsed.recommendedNextAction.trim()
          : 'Review conversation in CRM inbox.',
      sentiment:
        parsed.sentiment === 'positive' ||
        parsed.sentiment === 'urgent' ||
        parsed.sentiment === 'negative'
          ? parsed.sentiment
          : 'neutral',
    };
  } catch (parseErr) {
    console.error(
      '[AI Summary] Failed to parse JSON from model output:',
      rawText,
      parseErr,
    );
    // Fallback if model returned unstructured text
    return {
      overview: rawText.slice(0, 300) || 'Conversation completed.',
      requirements: [],
      questions: [],
      preferences: [],
      decisions: [],
      finalOutcome: 'Completed',
      recommendedNextAction: 'Review conversation in ChatFlow CRM.',
      sentiment: 'neutral',
    };
  }
}

/**
 * Orchestrator: Checks eligibility, generates summary with LLM,
 * and delivers the executive report via SMTP.
 *
 * Runs non-blockingly inside Next.js `after()` — NEVER throws!
 */
export async function triggerConversationSummaryEmail(args: {
  accountId: string;
  conversationId: string;
  contactId?: string | null;
  triggerReason: 'completed' | 'handoff' | 'closed';
}): Promise<void> {
  const { accountId, conversationId, contactId, triggerReason } = args;
  const db = supabaseAdmin();

  try {
    // 1. Fetch conversation row and verify eligibility
    const { data: conv, error: convErr } = await db
      .from('conversations')
      .select('id, contact_id, ai_reply_count, ai_summary_sent_at, updated_at')
      .eq('id', conversationId)
      .maybeSingle();

    if (convErr || !conv) return;

    // Only summarize threads where the AI actively participated
    if (!conv.ai_reply_count || conv.ai_reply_count < 1) return;

    // Deduplication check: if a summary was sent in the last 15 minutes, skip
    if (conv.ai_summary_sent_at) {
      const lastSent = new Date(conv.ai_summary_sent_at).getTime();
      const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
      if (lastSent > fifteenMinAgo) {
        return;
      }
    }

    // 2. Load AI configuration
    const config = await loadAiConfig(db, accountId);
    if (!config) return;

    // 3. Load conversation context messages
    const messages = await buildConversationContext(db, conversationId);
    if (!messages || messages.length < 2) return;

    // 4. Load contact details
    const targetContactId = contactId || conv.contact_id;
    let contactName = 'Customer';
    let contactPhone = 'WhatsApp Customer';
    let contactEmail: string | null = null;

    if (targetContactId) {
      const { data: contact } = await db
        .from('contacts')
        .select('name, phone, email')
        .eq('id', targetContactId)
        .maybeSingle();

      if (contact) {
        contactName = contact.name || contact.phone || 'Customer';
        contactPhone = contact.phone || '';
        contactEmail = contact.email || null;
      }
    }

    // 5. Load Account Name
    let accountName = 'ChatFlow CRM';
    const { data: account } = await db
      .from('accounts')
      .select('name')
      .eq('id', accountId)
      .maybeSingle();
    if (account?.name) {
      accountName = account.name;
    }

    // 6. Generate summary via LLM
    const summary = await generateConversationSummary({
      config,
      messages,
      contactName,
      contactPhone,
    });
    if (!summary) return;

    // Log AI token usage for summary mode
    void logAiUsage(db, {
      accountId,
      conversationId,
      mode: 'summary',
      provider: config.provider,
      model: config.model,
      usage: null,
    });

    // 7. Compose deep link URL to conversation in CRM
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') ||
      'http://localhost:3000';
    const chatUrl = `${baseUrl}/inbox?c=${conversationId}`;

    const summaryData: ConversationSummaryData = {
      customerName: contactName,
      customerPhone: contactPhone,
      customerEmail: contactEmail,
      conversationId,
      messageCount: messages.length,
      overview: summary.overview,
      requirements: summary.requirements,
      questions: summary.questions,
      preferences: summary.preferences,
      decisions: summary.decisions,
      finalOutcome: summary.finalOutcome,
      recommendedNextAction: summary.recommendedNextAction,
      sentiment: summary.sentiment,
      triggerReason,
      chatUrl,
      accountName,
    };

    // 8. Deliver email via SMTP
    await sendConversationSummaryEmail({
      accountId,
      conversationId,
      contactId: targetContactId,
      summaryData,
    });
  } catch (err) {
    console.error(
      '[triggerConversationSummaryEmail] Unexpected error during summary flow:',
      err,
    );
  }
}
