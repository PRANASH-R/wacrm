/**
 * Type definitions for SMTP email services and conversation summaries.
 */

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  fromName: string;
  fromEmail: string;
  recipientOverrideEmail?: string | null;
  autoSummaryEnabled?: boolean;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  smtpConfig?: SmtpConfig;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
}

export interface ConversationSummaryData {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  conversationId: string;
  messageCount: number;
  overview: string;
  requirements: string[];
  questions: string[];
  preferences: string[];
  decisions: string[];
  finalOutcome: string;
  recommendedNextAction: string;
  sentiment: 'positive' | 'neutral' | 'urgent' | 'negative';
  triggerReason: 'completed' | 'handoff' | 'closed';
  chatUrl: string;
  accountName?: string;
}
