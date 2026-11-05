import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/ai/admin-client';
import { loadAccountSmtpConfig } from '@/lib/email/transporter';

export const runtime = 'nodejs';

const MASKED_PASSWORD = '••••••••••••••••';

/**
 * GET /api/settings/smtp
 * Fetch current SMTP configuration for the account (password masked).
 */
export async function GET() {
  try {
    const { accountId } = await requireRole('viewer');
    const config = await loadAccountSmtpConfig(accountId);

    if (!config) {
      return NextResponse.json({
        configured: false,
        config: null,
      });
    }

    return NextResponse.json({
      configured: true,
      config: {
        host: config.host,
        port: config.port,
        secure: config.secure,
        username: config.username,
        password: config.password ? MASKED_PASSWORD : '',
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        recipientOverrideEmail: config.recipientOverrideEmail || '',
        autoSummaryEnabled: config.autoSummaryEnabled !== false,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/settings/smtp (admin+)
 * Save or update the account's SMTP configuration.
 */
export async function POST(request: Request) {
  try {
    const { accountId } = await requireRole('admin');
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
    const passwordInput =
      typeof body.password === 'string' ? body.password.trim() : '';
    const fromName =
      typeof body.fromName === 'string' && body.fromName.trim()
        ? body.fromName.trim()
        : 'ChatFlow CRM';
    const fromEmail =
      typeof body.fromEmail === 'string' && body.fromEmail.trim()
        ? body.fromEmail.trim()
        : username;
    const recipientOverrideEmail =
      typeof body.recipientOverrideEmail === 'string'
        ? body.recipientOverrideEmail.trim()
        : null;
    const autoSummaryEnabled = body.autoSummaryEnabled !== false;

    if (!host || !username) {
      return NextResponse.json(
        { error: 'Host and username are required' },
        { status: 400 },
      );
    }

    const db = supabaseAdmin();

    // Check if updating without changing masked password
    let password = passwordInput;
    if (!password || password === MASKED_PASSWORD) {
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
        { error: 'Password or API secret is required' },
        { status: 400 },
      );
    }

    const { error: upsertErr } = await db
      .from('account_smtp_settings')
      .upsert(
        {
          account_id: accountId,
          host,
          port,
          secure,
          username,
          password,
          from_name: fromName,
          from_email: fromEmail,
          recipient_override_email: recipientOverrideEmail || null,
          auto_summary_enabled: autoSummaryEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id' },
      );

    if (upsertErr) {
      console.error('[SMTP Settings] DB Upsert error:', upsertErr);
      return NextResponse.json(
        { error: 'Failed to save SMTP settings' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SMTP settings saved successfully',
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
