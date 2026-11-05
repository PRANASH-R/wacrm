"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  MessageSquare,
  Bell,
  Users,
  GitBranch,
  Radio,
  Zap,
  Workflow,
  Bot,
  Settings,
  UserPlus,
  Briefcase,
  Palette,
  Sun,
  Moon,
  ArrowRight,
  X,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeId } from "@/lib/themes";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  category: "navigation" | "actions" | "themes";
  title: string;
  subtitle?: string;
  icon: typeof LayoutDashboard;
  shortcut?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, setTheme, mode, setMode } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange]
  );

  const items: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: "nav-inbox",
        category: "navigation",
        title: "Shared Team Inbox",
        subtitle: "Customer conversations & chats",
        icon: MessageSquare,
        shortcut: "G I",
        onSelect: () => navigate("/inbox"),
      },
      {
        id: "nav-dashboard",
        category: "navigation",
        title: "Executive Dashboard",
        subtitle: "Real-time KPIs & reply queue",
        icon: LayoutDashboard,
        shortcut: "G D",
        onSelect: () => navigate("/dashboard"),
      },
      {
        id: "nav-notifications",
        category: "navigation",
        title: "Notifications Center",
        subtitle: "Assignments & operational alerts",
        icon: Bell,
        shortcut: "G N",
        onSelect: () => navigate("/notifications"),
      },
      {
        id: "nav-contacts",
        category: "navigation",
        title: "Contacts Directory",
        subtitle: "Customer CRM database",
        icon: Users,
        shortcut: "G C",
        onSelect: () => navigate("/contacts"),
      },
      {
        id: "nav-pipelines",
        category: "navigation",
        title: "Sales Pipelines",
        subtitle: "Kanban deal board",
        icon: GitBranch,
        shortcut: "G P",
        onSelect: () => navigate("/pipelines"),
      },
      {
        id: "nav-broadcasts",
        category: "navigation",
        title: "Broadcast Campaigns",
        subtitle: "Bulk WhatsApp template messages",
        icon: Radio,
        shortcut: "G B",
        onSelect: () => navigate("/broadcasts"),
      },
      {
        id: "nav-automations",
        category: "navigation",
        title: "Automations",
        subtitle: "Rule-based triggers & workflows",
        icon: Zap,
        shortcut: "G A",
        onSelect: () => navigate("/automations"),
      },
      {
        id: "nav-flows",
        category: "navigation",
        title: "Visual Flows Builder",
        subtitle: "Interactive node canvas",
        icon: Workflow,
        shortcut: "G F",
        onSelect: () => navigate("/flows"),
      },
      {
        id: "nav-agents",
        category: "navigation",
        title: "AI Agents & Copilot",
        subtitle: "Bot settings & playground",
        icon: Bot,
        onSelect: () => navigate("/agents"),
      },
      {
        id: "nav-settings",
        category: "navigation",
        title: "Settings & Team",
        subtitle: "WABA configuration & team roles",
        icon: Settings,
        shortcut: "G S",
        onSelect: () => navigate("/settings"),
      },

      // Quick Actions
      {
        id: "act-new-contact",
        category: "actions",
        title: "New Contact",
        subtitle: "Add a customer to directory",
        icon: UserPlus,
        shortcut: "N C",
        onSelect: () => navigate("/contacts"),
      },
      {
        id: "act-new-deal",
        category: "actions",
        title: "New Deal",
        subtitle: "Create opportunity in pipeline",
        icon: Briefcase,
        shortcut: "N D",
        onSelect: () => navigate("/pipelines"),
      },
      {
        id: "act-new-broadcast",
        category: "actions",
        title: "New Broadcast Campaign",
        subtitle: "Launch 4-step template wizard",
        icon: Radio,
        shortcut: "N B",
        onSelect: () => navigate("/broadcasts/new"),
      },

      // Theme Options (Strictly Non-Purple)
      {
        id: "theme-cobalt",
        category: "themes",
        title: "Theme: Cobalt & Cyan (Option A)",
        subtitle: "Linear & Stripe inspired SaaS command center",
        icon: Palette,
        onSelect: () => {
          setTheme("cobalt" as ThemeId);
          onOpenChange(false);
        },
      },
      {
        id: "theme-emerald",
        category: "themes",
        title: "Theme: WhatsApp Emerald (Option B)",
        subtitle: "Meta WhatsApp Business dark pine and mint",
        icon: Palette,
        onSelect: () => {
          setTheme("emerald" as ThemeId);
          onOpenChange(false);
        },
      },
      {
        id: "theme-amber",
        category: "themes",
        title: "Theme: Sunset Orange (Option C)",
        subtitle: "Nordic carbon slate with warm sunset orange",
        icon: Palette,
        onSelect: () => {
          setTheme("amber" as ThemeId);
          onOpenChange(false);
        },
      },
      {
        id: "theme-cyan",
        category: "themes",
        title: "Theme: Luminous Cyan",
        subtitle: "Vibrant electric cyan and teal accents",
        icon: Palette,
        onSelect: () => {
          setTheme("cyan" as ThemeId);
          onOpenChange(false);
        },
      },
      {
        id: "theme-mode",
        category: "themes",
        title: `Switch to ${mode === "dark" ? "Light" : "Dark"} Mode`,
        subtitle: `Currently in ${mode} mode`,
        icon: mode === "dark" ? Sun : Moon,
        onSelect: () => {
          setMode(mode === "dark" ? "light" : "dark");
          onOpenChange(false);
        },
      },
    ],
    [navigate, setTheme, setMode, mode, onOpenChange]
  );

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  }, [items, query]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global keydown listeners for keyboard navigation
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, filteredItems, selectedIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Palette Dialog */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions, or themes..."
            autoFocus
            className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p
                          className={cn(
                            "truncate text-xs",
                            isSelected
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          )}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    {item.shortcut && (
                      <kbd
                        className={cn(
                          "pointer-events-none rounded px-1.5 py-0.5 font-mono text-[10px]",
                          isSelected
                            ? "bg-white/20 text-white"
                            : "border border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {item.shortcut}
                      </kbd>
                    )}
                    <ArrowRight
                      className={cn(
                        "h-4 w-4 shrink-0 transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono">
                ↑
              </kbd>{" "}
              <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono">
                ↓
              </kbd>{" "}
              to navigate
            </span>
            <span>·</span>
            <span>
              <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono">
                ↵
              </kbd>{" "}
              to select
            </span>
          </div>
          <span className="font-mono text-[10px] text-primary">
            ChatFlow CRM Command Center
          </span>
        </div>
      </div>
    </div>
  );
}
