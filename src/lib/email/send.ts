import { supabaseAdmin } from '@/lib/ai/admin-client';
import {
  createSmtpTransporter,
  loadAccountSmtpConfig,
} from './transporter';
import { renderConversationSummaryEmail } from './templates/summary-report';
import type {
  ConversationSummaryData,
  SendEmailOptions,
  SendEmailResult,
} from './types';

/**
 * Send an email via SMTP. Gracefully returns an error object without throwing
 * if SMTP is unconfigured or a network error occurs.
 */
export async function sendEmail(
  options: SendEmailOptions & { accountId?: string | null },
): Promise<SendEmailResult> {
  const { accountId, to, subject, html, text, from, replyTo, smtpConfig } =
    options;

  try {
    const config = smtpConfig || (await loadAccountSmtpConfig(accountId));
    if (!config) {
      return {
        success: false,
        error: 'SMTP is not configured for this account or server',
      };
    }

    const transporter = createSmtpTransporter(config);
    const fromAddress =
      from ||
      (config.fromName
        ? `"${config.fromName}" <${config.fromEmail}>`
        : config.fromEmail);

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
      replyTo: replyTo || undefined,
    });

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[sendEmail] Failed to deliver email via SMTP:', errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * High-level orchestrator: Resolves shop owner / manager recipient emails,
 * renders the summary brief, dispatches the email via SMTP, and records
 * audit logs in Supabase.
 */
export async function sendConversationSummaryEmail(args: {
  accountId: string;
  conversationId: string;
  contactId?: string | null;
  summaryData: ConversationSummaryData;
}): Promise<SendEmailResult> {
  const { accountId, conversationId, contactId, summaryData } = args;
  const db = supabaseAdmin();

  try {
    const config = await loadAccountSmtpConfig(accountId);
    if (!config || config.autoSummaryEnabled === false) {
      return {
        success: false,
        error: 'SMTP not configured or auto-summaries disabled',
      };
    }

    // Resolve recipients:
    // 1. Check custom recipient override(s)
    // 2. Fall back to the account owner's profile email
    const recipients: string[] = [];

    if (config.recipientOverrideEmail?.trim()) {
      const overrides = config.recipientOverrideEmail
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.includes('@'));
      recipients.push(...overrides);
    }

    // Always ensure the account owner gets it if no override or if owner should be included
    if (recipients.length === 0) {
      const { data: owner } = await db
        .from('profiles')
        .select('email')
        .eq('account_id', accountId)
        .eq('account_role', 'owner')
        .maybeSingle();

      if (owner?.email) {
        recipients.push(owner.email);
      }
    }

    if (recipients.length === 0) {
      console.warn(
        `[sendConversationSummaryEmail] No recipient found for account ${accountId}`,
      );
      return {
        success: false,
        error: 'No owner or notification recipient email found',
      };
    }

    // Render email template
    const { subject, html, text } = renderConversationSummaryEmail(summaryData);

    // Send email
    const result = await sendEmail({
      accountId,
      smtpConfig: config,
      to: recipients,
      subject,
      html,
      text,
    });

    if (result.success) {
      const now = new Date().toISOString();

      // Mark conversation so we don't send duplicate emails for this session
      await db
        .from('conversations')
        .update({ ai_summary_sent_at: now })
        .eq('id', conversationId);

      // Audit log the summary
      await db.from('ai_conversation_summaries').insert({
        account_id: accountId,
        conversation_id: conversationId,
        contact_id: contactId || null,
        overview: summaryData.overview,
        requirements: summaryData.requirements,
        questions: summaryData.questions,
        preferences: summaryData.preferences,
        decisions: summaryData.decisions,
        final_outcome: summaryData.finalOutcome,
        recommended_action: summaryData.recommendedNextAction,
        sentiment: summaryData.sentiment,
        trigger_reason: summaryData.triggerReason,
        email_sent_to: recipients.join(', '),
      });
    }

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(
      '[sendConversationSummaryEmail] Unexpected dispatch error:',
      errorMsg,
    );
    return { success: false, error: errorMsg };
  }
}
