import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/ai/admin-client';
import {
  verifySmtpConnection,
  createSmtpTransporter,
} from '@/lib/email/transporter';
import type { SmtpConfig } from '@/lib/email/types';

export const runtime = 'nodejs';

const MASKED_PASSWORD = '••••••••••••••••';

/**
 * POST /api/settings/smtp/test (admin+)
 * Test SMTP connection and optionally send a test message.
 */
export async function POST(request: Request) {
  try {
    const { accountId, userId } = await requireRole('admin');
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      );
    }

    const host = typeof body.host === 'string' ? body.host.trim() : '';
    const port = Number(body.port) || 587;
    const secure = Boolean(body.secure);
    const username =
      typeof body.username === 'string' ? body.username.trim() : '';
    let password =
      typeof body.password === 'string' ? body.password.trim() : '';
    const fromName =
      typeof body.fromName === 'string' && body.fromName.trim()
        ? body.fromName.trim()
        : 'ChatFlow CRM';
    const fromEmail =
      typeof body.fromEmail === 'string' && body.fromEmail.trim()
        ? body.fromEmail.trim()
        : username;

    let defaultRecipient: string | null = null;
    if (!body.sendTestEmailTo || typeof body.sendTestEmailTo !== 'string') {
      const db = supabaseAdmin();
      const { data: profile } = await db
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      defaultRecipient = profile?.email || null;
    }

    const sendTestEmailTo =
      typeof body.sendTestEmailTo === 'string' && body.sendTestEmailTo.trim()
        ? body.sendTestEmailTo.trim()
        : defaultRecipient;

    if (!host || !username) {
      return NextResponse.json(
        { error: 'Host and username are required' },
        { status: 400 },
      );
    }

    // Resolve masked password from existing DB row
    if (!password || password === MASKED_PASSWORD) {
      const db = supabaseAdmin();
      const { data: existing } = await db
        .from('account_smtp_settings')
        .select('password')
        .eq('account_id', accountId)
        .maybeSingle();

      if (existing?.password) {
        password = existing.password;
      }
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password or API secret is required for testing' },
        { status: 400 },
      );
    }

    const config: SmtpConfig = {
      host,
      port,
      secure,
      username,
      password,
      fromName,
      fromEmail,
    };

    // 1. Verify socket connection and TLS handshake
    const verifyResult = await verifySmtpConnection(config);
    if (!verifyResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: verifyResult.message,
          latencyMs: verifyResult.latencyMs,
        },
        { status: 400 },
      );
    }

    // 2. If a recipient is available, send a test email
    let sentTestEmail = false;
    let messageId: string | undefined;

    if (sendTestEmailTo && sendTestEmailTo.includes('@')) {
      const transporter = createSmtpTransporter(config);
      const testInfo = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: sendTestEmailTo,
        subject: '✓ ChatFlow CRM — SMTP Connection Verified',
        html: `
          <div style="font-family: sans-serif; padding: 24px; background-color: #f8fafc; color: #0f172a;">
            <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
              <h2 style="color: #0d9488; margin-top: 0;">✓ SMTP Connected Successfully</h2>
              <p style="font-size: 14px; line-height: 1.5; color: #334155;">
                This test email confirms that your SMTP server configuration in <strong>ChatFlow CRM</strong> is working properly.
              </p>
              <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 12px; font-family: monospace; color: #475569; margin: 16px 0;">
                Host: ${host}:${port}<br/>
                User: ${username}<br/>
                Latency: ${verifyResult.latencyMs}ms<br/>
                Timestamp: ${new Date().toUTCString()}
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">
                Executive summaries of completed AI agent conversations will be delivered to you using this service.
              </p>
            </div>
          </div>
        `.trim(),
        text: `ChatFlow CRM SMTP Test\n\nSMTP connected successfully!\nHost: ${host}:${port}\nUser: ${username}\nLatency: ${verifyResult.latencyMs}ms`,
      });
      sentTestEmail = true;
      messageId = testInfo.messageId;
    }

    return NextResponse.json({
      success: true,
      message: 'SMTP socket verified and credentials authenticated successfully',
      latencyMs: verifyResult.latencyMs,
      sentTestEmail,
      messageId,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
