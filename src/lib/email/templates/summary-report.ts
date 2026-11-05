import type { ConversationSummaryData } from '../types';

/**
 * Render an executive conversation summary into a responsive HTML email
 * and a plain-text fallback. Modern slate & teal styling, strictly zero purple.
 */
export function renderConversationSummaryEmail(data: ConversationSummaryData): {
  subject: string;
  html: string;
  text: string;
} {
  const triggerLabel =
    data.triggerReason === 'completed'
      ? 'Inquiry Completed'
      : data.triggerReason === 'handoff'
        ? 'Handed off to Agent'
        : 'Conversation Closed';

  const sentimentColor =
    data.sentiment === 'positive'
      ? '#059669' // emerald
      : data.sentiment === 'urgent'
        ? '#d97706' // amber
        : data.sentiment === 'negative'
          ? '#dc2626' // red
          : '#475569'; // slate

  const sentimentLabel =
    data.sentiment === 'positive'
      ? 'Positive Intent'
      : data.sentiment === 'urgent'
        ? 'Urgent / Attention'
        : data.sentiment === 'negative'
          ? 'Dissatisfied'
          : 'Neutral';

  const subject = `[ChatFlow AI] Summary: ${data.customerName || data.customerPhone} — ${data.finalOutcome}`;

  const renderList = (items: string[]) => {
    if (!items || items.length === 0) {
      return '<li style="color: #94a3b8; font-style: italic; margin-bottom: 6px;">None recorded</li>';
    }
    return items
      .map(
        (item) =>
          `<li style="margin-bottom: 6px; color: #1e293b; line-height: 1.5;">${escapeHtml(item)}</li>`,
      )
      .join('');
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <tr>
      <td style="padding: 24px 28px 20px; background: linear-gradient(180deg, #0f766e 0%, #0d9488 100%); color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <span style="display: inline-block; padding: 4px 10px; background-color: rgba(255,255,255,0.2); border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                ${escapeHtml(triggerLabel)}
              </span>
              <h1 style="margin: 10px 0 4px; font-size: 20px; font-weight: 700; color: #ffffff;">
                Customer Conversation Summary
              </h1>
              <p style="margin: 0; font-size: 13px; color: #ccfbf1;">
                ${escapeHtml(data.accountName || 'ChatFlow CRM')} · AI Agent Executive Brief
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Customer Overview Bar -->
    <tr>
      <td style="padding: 20px 28px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="vertical-align: top;">
              <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; display: block;">Customer</span>
              <strong style="font-size: 15px; color: #0f172a;">${escapeHtml(data.customerName)}</strong>
              <div style="font-size: 13px; color: #475569; font-family: monospace; margin-top: 2px;">
                ${escapeHtml(data.customerPhone)}
              </div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; display: block;">Sentiment</span>
              <span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; color: #ffffff; background-color: ${sentimentColor}; margin-top: 2px;">
                ${escapeHtml(sentimentLabel)}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 28px;">
        
        <!-- Executive Overview -->
        <div style="margin-bottom: 24px;">
          <h2 style="margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #0d9488; font-weight: 700;">
            Executive Overview
          </h2>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #334155;">
            ${escapeHtml(data.overview)}
          </p>
        </div>

        <!-- Requirements & Inquiries -->
        <div style="margin-bottom: 20px; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h3 style="margin: 0 0 10px; font-size: 13px; color: #0f172a; font-weight: 700;">
            📋 Customer Requirements
          </h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
            ${renderList(data.requirements)}
          </ul>
        </div>

        <!-- Questions Asked -->
        <div style="margin-bottom: 20px; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h3 style="margin: 0 0 10px; font-size: 13px; color: #0f172a; font-weight: 700;">
            ❓ Key Questions Asked
          </h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
            ${renderList(data.questions)}
          </ul>
        </div>

        <!-- Preferences & Constraints -->
        <div style="margin-bottom: 20px; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h3 style="margin: 0 0 10px; font-size: 13px; color: #0f172a; font-weight: 700;">
            💡 Preferences &amp; Constraints
          </h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
            ${renderList(data.preferences)}
          </ul>
        </div>

        <!-- Decisions Made -->
        <div style="margin-bottom: 20px; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h3 style="margin: 0 0 10px; font-size: 13px; color: #0f172a; font-weight: 700;">
            🤝 Decisions Made
          </h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
            ${renderList(data.decisions)}
          </ul>
        </div>

        <!-- Outcome & Recommended Action -->
        <div style="margin-bottom: 28px; padding: 18px; background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px;">
          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0f766e; display: block; margin-bottom: 2px;">
              🎯 Final Outcome
            </span>
            <span style="font-size: 14px; font-weight: 700; color: #115e59;">
              ${escapeHtml(data.finalOutcome)}
            </span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0f766e; display: block; margin-bottom: 2px;">
              ⚡ Recommended Action
            </span>
            <span style="font-size: 13px; color: #134e4a; line-height: 1.5;">
              ${escapeHtml(data.recommendedNextAction)}
            </span>
          </div>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin-top: 10px; margin-bottom: 10px;">
          <a href="${escapeHtml(data.chatUrl)}" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #0d9488; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 10px; box-shadow: 0 2px 4px rgba(13,148,136,0.2);">
            Open Conversation in ChatFlow CRM &rarr;
          </a>
        </div>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 18px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        This automated brief was generated by ChatFlow CRM AI Agent after ${data.messageCount} messages.
      </td>
    </tr>

  </table>
</body>
</html>
  `.trim();

  const text = `
================================================================================
CHATFLOW CRM — EXECUTIVE CONVERSATION SUMMARY
================================================================================

Trigger:         ${triggerLabel}
Customer:        ${data.customerName} (${data.customerPhone})
Sentiment:       ${sentimentLabel}
Outcome:         ${data.finalOutcome}

--------------------------------------------------------------------------------
EXECUTIVE OVERVIEW:
${data.overview}

--------------------------------------------------------------------------------
📋 CUSTOMER REQUIREMENTS:
${(data.requirements || []).map((r) => `  • ${r}`).join('\n') || '  • None'}

--------------------------------------------------------------------------------
❓ QUESTIONS ASKED:
${(data.questions || []).map((q) => `  • ${q}`).join('\n') || '  • None'}

--------------------------------------------------------------------------------
💡 PREFERENCES & CONSTRAINTS:
${(data.preferences || []).map((p) => `  • ${p}`).join('\n') || '  • None'}

--------------------------------------------------------------------------------
🤝 DECISIONS MADE:
${(data.decisions || []).map((d) => `  • ${d}`).join('\n') || '  • None'}

--------------------------------------------------------------------------------
🎯 FINAL OUTCOME & RECOMMENDED ACTION:
Outcome:            ${data.finalOutcome}
Recommended Action: ${data.recommendedNextAction}

--------------------------------------------------------------------------------
Open conversation: ${data.chatUrl}
================================================================================
  `.trim();

  return { subject, html, text };
}

function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
