import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { triggerConversationSummaryEmail } from '@/lib/ai/summary';

export const runtime = 'nodejs';

/**
 * POST /api/ai/summary (agent+)
 *
 * Body: { conversation_id, reason?: 'completed' | 'handoff' | 'closed' }
 *
 * Generates an executive summary of the conversation and emails it
 * to the shop owner via SMTP.
 */
export async function POST(request: Request) {
  try {
    const { accountId, userId } = await requireRole('agent');

    const limit = checkRateLimit(
      `ai-summary:${userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => null);
    const conversationId =
      body && typeof body.conversation_id === 'string'
        ? body.conversation_id.trim()
        : '';

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 },
      );
    }

    const reason =
      body?.reason === 'completed' || body?.reason === 'handoff'
        ? body.reason
        : 'closed';

    // Trigger summarization & email delivery
    await triggerConversationSummaryEmail({
      accountId,
      conversationId,
      triggerReason: reason,
    });

    return NextResponse.json({
      success: true,
      message: 'Conversation summary generated and dispatched via SMTP',
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
