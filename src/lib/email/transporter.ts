import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { supabaseAdmin } from '@/lib/ai/admin-client';
import type { SmtpConfig } from './types';

/**
 * Load the account's SMTP settings from the database, falling back
 * to server environment variables if unconfigured or incomplete.
 */
export async function loadAccountSmtpConfig(
  accountId?: string | null,
): Promise<SmtpConfig | null> {
  if (accountId) {
    try {
      const db = supabaseAdmin();
      const { data, error } = await db
        .from('account_smtp_settings')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle();

      if (!error && data && data.host && data.username) {
        return {
          host: data.host,
          port: data.port || 587,
          secure: Boolean(data.secure),
          username: data.username,
          password: data.password,
          fromName: data.from_name || 'ChatFlow CRM',
          fromEmail: data.from_email || data.username,
          recipientOverrideEmail: data.recipient_override_email || null,
          autoSummaryEnabled: data.auto_summary_enabled !== false,
        };
      }
    } catch (err) {
      console.warn('[SMTP] Failed to load account_smtp_settings from DB:', err);
    }
  }

  // Fallback to server-level environment variables
  const envHost = process.env.SMTP_HOST?.trim();
  const envUser = process.env.SMTP_USER?.trim();
  const envPass = process.env.SMTP_PASS?.trim();

  if (envHost && envUser) {
    return {
      host: envHost,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      username: envUser,
      password: envPass,
      fromName: process.env.SMTP_FROM_NAME?.trim() || 'ChatFlow CRM',
      fromEmail: process.env.SMTP_FROM_EMAIL?.trim() || envUser,
      recipientOverrideEmail: process.env.SMTP_NOTIFY_EMAIL?.trim() || null,
      autoSummaryEnabled: true,
    };
  }

  return null;
}

/**
 * Create a pooled nodemailer transporter for the given configuration.
 */
export function createSmtpTransporter(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure || config.port === 465,
    auth: {
      user: config.username,
      pass: config.password || '',
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5, // max 5 emails per second to avoid ISP rate-limiting
  });
}

/**
 * Verify socket connection and TLS handshake with the SMTP server.
 */
export async function verifySmtpConnection(
  config: SmtpConfig,
): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const start = Date.now();
  const transporter = createSmtpTransporter(config);
  try {
    await transporter.verify();
    return {
      success: true,
      message: 'SMTP connection verified successfully',
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: errorMsg,
      latencyMs: Date.now() - start,
    };
  }
}
