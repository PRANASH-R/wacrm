"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Contact, Deal, ContactNote, Tag } from "@/types";
import {
  Phone,
  Mail,
  Copy,
  Check,
  Tag as TagIcon,
  DollarSign,
  StickyNote,
  Plus,
  ExternalLink,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { contactHandle } from "@/lib/whatsapp/wa-identity";
import Link from "next/link";

interface ContactSidebarProps {
  contact: Contact | null;
}

export function ContactSidebar({ contact }: ContactSidebarProps) {
  const tSidebar = useTranslations("Inbox.sidebar");
  const tThread = useTranslations("Inbox.messageThread");

  const { accountId } = useAuth();
  const [copied, setCopied] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [tags, setTags] = useState<(Tag & { contact_tag_id: string })[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "deals" | "notes">("details");

  const fetchContactData = useCallback(async () => {
    if (!contact) return;

    const supabase = createClient();

    const [dealsRes, notesRes, tagsRes] = await Promise.all([
      supabase
        .from("deals")
        .select("*, stage:pipeline_stages(*)")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_notes")
        .select("*")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_tags")
        .select("id, tag_id, tags(*)")
        .eq("contact_id", contact.id),
    ]);

    if (dealsRes.data) setDeals(dealsRes.data);
    if (notesRes.data) setNotes(notesRes.data);
    if (tagsRes.data) {
      const mapped = tagsRes.data
        .filter((ct: Record<string, unknown>) => ct.tags)
        .map((ct: Record<string, unknown>) => ({
          ...(ct.tags as Tag),
          contact_tag_id: ct.id as string,
        }));
      setTags(mapped);
    }
  }, [contact]);

  useEffect(() => {
    fetchContactData();
  }, [fetchContactData]);

  const handleCopyPhone = useCallback(async () => {
    const handle = contact ? contactHandle(contact) : "";
    if (!handle) return;
    await navigator.clipboard.writeText(handle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [contact]);

  const handleAddNote = useCallback(async () => {
    if (!contact || !newNote.trim()) return;
    if (!accountId) return;
    setAddingNote(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("contact_notes")
      .insert({
        contact_id: contact.id,
        note_text: newNote.trim(),
        account_id: accountId,
      })
      .select()
      .single();

    if (!error && data) {
      setNotes((prev) => [data, ...prev]);
      setNewNote("");
    }
    setAddingNote(false);
  }, [contact, newNote, accountId]);

  if (!contact) {
    return (
      <div className="flex h-full w-72 items-center justify-center border-l border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {tThread("selectConversation")}
        </p>
      </div>
    );
  }

  const displayName = contact.name || contactHandle(contact);
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full w-72 flex-col border-l border-border bg-card">
      {/* Contact Profile Header */}
      <div className="p-4 border-b border-border flex flex-col items-center text-center">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary ring-2 ring-border">
            {contact.avatar_url ? (
              <img
                src={contact.avatar_url}
                alt={displayName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500" />
        </div>
        <h3 className="mt-2.5 text-sm font-bold text-foreground truncate max-w-full">
          {displayName}
        </h3>
        {contact.company && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Building className="h-3 w-3" />
            <span className="truncate">{contact.company}</span>
          </p>
        )}
      </div>

      {/* Tabs Control */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "details" | "deals" | "notes")}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="px-3 pt-2">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="details" className="text-xs">
              Details
            </TabsTrigger>
            <TabsTrigger value="deals" className="text-xs">
              Deals ({deals.length})
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">
              Notes ({notes.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Contact Details */}
        <TabsContent value="details" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Phone row */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  WhatsApp Phone
                </span>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-mono text-foreground hover:bg-muted/70 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>{contactHandle(contact)}</span>
                  </span>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Email row */}
              {contact.email && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Email Address
                  </span>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground truncate">
                    <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                </div>
              )}

              {/* Tags Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <TagIcon className="h-3 w-3" />
                    {tSidebar("tags")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {tags.length} assigned
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      {tSidebar("noTags")}
                    </p>
                  ) : (
                    tags.map((tag) => (
                      <span
                        key={tag.contact_tag_id}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border"
                        style={{
                          backgroundColor: `${tag.color}15`,
                          color: tag.color,
                          borderColor: `${tag.color}30`,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-border space-y-2">
                <Link
                  href={`/contacts?id=${contact.id}`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in Contacts CRM</span>
                </Link>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Tab 2: Deals */}
        <TabsContent value="deals" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-primary" />
                  Pipeline Opportunities
                </span>
                <Link
                  href="/pipelines"
                  className="text-[11px] text-primary hover:underline"
                >
                  View Kanban
                </Link>
              </div>

              {deals.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-muted-foreground">{tSidebar("noDeals")}</p>
                </div>
              ) : (
                deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-xl border border-border bg-muted/40 p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-foreground">
                        {deal.title}
                      </p>
                      {deal.stage && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                          style={{
                            backgroundColor: `${deal.stage.color}15`,
                            color: deal.stage.color,
                            borderColor: `${deal.stage.color}30`,
                          }}
                        >
                          {deal.stage.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-mono font-bold text-primary">
                      {deal.currency ?? "$"}
                      {deal.value.toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Tab 3: Notes */}
        <TabsContent value="notes" className="flex-1 min-h-0 mt-0 flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
                placeholder={tSidebar("addNotePlaceholder")}
                className="flex-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                className="h-8 px-2.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2.5">
              {notes.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-muted-foreground italic">
                    {tSidebar("noNotes")}
                  </p>
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-xl border border-border bg-muted/30 p-2.5 text-xs"
                  >
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                      {note.note_text}
                    </p>
                    <span className="mt-1.5 block text-[10px] text-muted-foreground">
                      {format(new Date(note.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
