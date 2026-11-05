'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { canEditSettings } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { SettingsPanelHead } from './settings-panel-head';

const MASKED_PASSWORD = '••••••••••••••••';

interface ProviderPreset {
  name: string;
  host: string;
  port: number;
  secure: boolean;
}

const PRESETS: Record<string, ProviderPreset> = {
  gmail: {
    name: 'Gmail / Google Workspace',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
  },
  ses: {
    name: 'Amazon SES',
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false,
  },
  sendgrid: {
    name: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
  },
  brevo: {
    name: 'Brevo (Sendinblue)',
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
  },
};

export function SmtpSettings() {
  const { accountRole } = useAuth();
  const canEdit = accountRole ? canEditSettings(accountRole) : false;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromName, setFromName] = useState('ChatFlow CRM');
  const [fromEmail, setFromEmail] = useState('');
  const [recipientOverride, setRecipientOverride] = useState('');
  const [autoSummaryEnabled, setAutoSummaryEnabled] = useState(true);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Fetch current SMTP settings on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/settings/smtp');
        if (!res.ok) throw new Error('Failed to load settings');
        const data = await res.json();
        if (alive && data?.configured && data.config) {
          setHost(data.config.host || '');
          setPort(data.config.port || 587);
          setSecure(Boolean(data.config.secure));
          setUsername(data.config.username || '');
          setPassword(data.config.password || '');
          setFromName(data.config.fromName || 'ChatFlow CRM');
          setFromEmail(data.config.fromEmail || '');
          setRecipientOverride(data.config.recipientOverrideEmail || '');
          setAutoSummaryEnabled(data.config.autoSummaryEnabled !== false);
        }
      } catch (err) {
        console.error('Error loading SMTP settings:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const handleApplyPreset = (key: string) => {
    const p = PRESETS[key];
    if (!p) return;
    setHost(p.host);
    setPort(p.port);
    setSecure(p.secure);
    toast.info(`Applied ${p.name} preset`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!host.trim() || !username.trim()) {
      toast.error('Host and username are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port: Number(port) || 587,
          secure,
          username: username.trim(),
          password: password.trim(),
          fromName: fromName.trim(),
          fromEmail: fromEmail.trim(),
          recipientOverrideEmail: recipientOverride.trim(),
          autoSummaryEnabled,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save settings');
      }

      toast.success('SMTP settings saved successfully');
      setPassword(MASKED_PASSWORD);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!host.trim() || !username.trim()) {
      toast.error('Please fill in host and username first');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port: Number(port) || 587,
          secure,
          username: username.trim(),
          password: password.trim(),
          fromName: fromName.trim(),
          fromEmail: fromEmail.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestResult({
          success: false,
          message: data?.error || 'Connection failed',
        });
        toast.error('SMTP test failed');
      } else {
        setTestResult({
          success: true,
          message: data?.message || 'Connection verified',
          latencyMs: data?.latencyMs,
        });
        toast.success(
          data?.sentTestEmail
            ? 'Connection verified & test email dispatched!'
            : 'Connection verified!',
        );
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Network failure',
      });
      toast.error('Test connection error');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsPanelHead
        title="Email & SMTP Settings"
        description="Configure outbound SMTP credentials to deliver automated AI conversation briefs to the shop owner."
      />

      {/* AI Conversation Brief Feature Spotlight */}
      <Card className="border-teal-500/20 bg-teal-500/5">
        <CardContent className="flex items-start gap-3.5 p-5">
          <div className="rounded-xl bg-teal-600/10 p-2 text-teal-600 dark:text-teal-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">
              Automated AI Executive Summaries
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When a customer completes a conversation with the AI agent, ChatFlow
              CRM extracts their requirements, key questions, preferences,
              decisions, and final outcome, then automatically dispatches an executive
              email report to the shop owner.
            </p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Provider Presets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Provider Presets</CardTitle>
            <CardDescription className="text-xs">
              Pre-fill standard server hostnames and recommended encryption ports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([key, p]) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs hover:border-teal-500/50 hover:bg-teal-500/5"
                  onClick={() => handleApplyPreset(key)}
                  disabled={!canEdit}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Server & Authentication Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SMTP Server Configuration</CardTitle>
            <CardDescription className="text-xs">
              Credentials are encrypted and isolated to your workspace account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.example.com"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  disabled={!canEdit}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  placeholder="587"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  disabled={!canEdit}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="smtp-user">Username / API Key</Label>
                <Input
                  id="smtp-user"
                  placeholder="username@domain.com or apikey"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!canEdit}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-pass">Password / App Secret</Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  placeholder={MASKED_PASSWORD}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!canEdit}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="from-name">Sender Name ("From")</Label>
                <Input
                  id="from-name"
                  placeholder="ChatFlow CRM"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  disabled={!canEdit}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="from-email">Sender Email Address</Label>
                <Input
                  id="from-email"
                  type="email"
                  placeholder="notifications@yourdomain.com"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  disabled={!canEdit}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3.5">
              <div className="space-y-0.5">
                <Label htmlFor="smtp-secure" className="text-xs font-medium cursor-pointer">
                  Require SSL / TLS (Port 465)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Leave off for STARTTLS (Port 587); enable for direct SSL (Port 465).
                </p>
              </div>
              <Switch
                id="smtp-secure"
                checked={secure}
                onCheckedChange={setSecure}
                disabled={!canEdit}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Conversation Summary Delivery Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Shop Owner Notification Settings</CardTitle>
            <CardDescription className="text-xs">
              Control where and when executive summaries are delivered.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3.5">
              <div className="space-y-0.5">
                <Label htmlFor="auto-summary" className="text-xs font-medium cursor-pointer">
                  Automatically Email Conversation Summaries
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Sends an executive brief to the owner when the AI completes an inquiry, hands off to staff, or conversation closes.
                </p>
              </div>
              <Switch
                id="auto-summary"
                checked={autoSummaryEnabled}
                onCheckedChange={setAutoSummaryEnabled}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recipient-override">
                Shop Owner / Notification Recipient Email
              </Label>
              <Input
                id="recipient-override"
                placeholder="Leave blank to use Account Owner's login email (or enter comma-separated emails)"
                value={recipientOverride}
                onChange={(e) => setRecipientOverride(e.target.value)}
                disabled={!canEdit}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                By default, summaries are sent to the Account Owner. You can specify a different email or multiple emails separated by commas.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Live Diagnostics & Test Result Box */}
        {testResult && (
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 text-xs ${
              testResult.success
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'border-destructive/20 bg-destructive/10 text-destructive'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <div className="space-y-1">
              <span className="font-semibold block">
                {testResult.success ? 'SMTP Connection Verified' : 'Connection Failed'}
              </span>
              <p className="leading-relaxed">{testResult.message}</p>
              {testResult.latencyMs !== undefined && (
                <span className="inline-block text-[11px] opacity-80">
                  Latency: {testResult.latencyMs}ms
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || !canEdit}
            className="w-full sm:w-auto rounded-xl text-xs gap-1.5"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Test Connection &amp; Send Probe
          </Button>

          <Button
            type="submit"
            disabled={saving || !canEdit}
            className="w-full sm:w-auto rounded-xl text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-xs gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            Save SMTP Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
