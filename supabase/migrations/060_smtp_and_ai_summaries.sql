-- Migration 060: SMTP email settings and AI conversation summaries
--
-- 1. `account_smtp_settings`: Stores per-account SMTP configuration
--    (host, port, auth, from header, recipient overrides).
-- 2. Add `ai_summary_sent_at` column to `conversations` to prevent duplicate summary dispatches.

CREATE TABLE IF NOT EXISTS public.account_smtp_settings (
  account_id UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  secure BOOLEAN NOT NULL DEFAULT FALSE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT 'ChatFlow CRM',
  from_email TEXT NOT NULL,
  recipient_override_email TEXT,
  auto_summary_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row-Level Security
ALTER TABLE public.account_smtp_settings ENABLE ROW LEVEL SECURITY;

-- Account members can view the account's SMTP status/config
CREATE POLICY "account_smtp_settings_select" ON public.account_smtp_settings
  FOR SELECT
  USING (account_id = current_account_id());

-- Only admins and owners can insert/update/delete SMTP settings
CREATE POLICY "account_smtp_settings_insert" ON public.account_smtp_settings
  FOR INSERT
  WITH CHECK (account_id = current_account_id() AND is_account_admin());

CREATE POLICY "account_smtp_settings_update" ON public.account_smtp_settings
  FOR UPDATE
  USING (account_id = current_account_id() AND is_account_admin());

CREATE POLICY "account_smtp_settings_delete" ON public.account_smtp_settings
  FOR DELETE
  USING (account_id = current_account_id() AND is_account_admin());

-- Add `ai_summary_sent_at` to `conversations` to prevent duplicate summary emails
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS ai_summary_sent_at TIMESTAMPTZ;

-- Table to store historical AI conversation summaries for audit and display
CREATE TABLE IF NOT EXISTS public.ai_conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  overview TEXT NOT NULL,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  final_outcome TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  trigger_reason TEXT NOT NULL DEFAULT 'completed',
  email_sent_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ai_conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conversation_summaries_select" ON public.ai_conversation_summaries
  FOR SELECT
  USING (account_id = current_account_id());

CREATE POLICY "ai_conversation_summaries_insert" ON public.ai_conversation_summaries
  FOR INSERT
  WITH CHECK (account_id = current_account_id());

CREATE INDEX IF NOT EXISTS idx_ai_summaries_conv_id ON public.ai_conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_account_id ON public.ai_conversation_summaries(account_id);

-- Allow 'summary' mode in ai_usage_log
ALTER TABLE public.ai_usage_log
  DROP CONSTRAINT IF EXISTS ai_usage_log_mode_check;
ALTER TABLE public.ai_usage_log
  ADD CONSTRAINT ai_usage_log_mode_check CHECK (mode IN ('auto_reply', 'draft', 'summary'));
