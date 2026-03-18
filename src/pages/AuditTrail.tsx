import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  ArrowLeft, History, Search, Filter, ChevronDown, ChevronRight,
  CheckCircle2, Clock, XCircle, RotateCcw, Eye, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useLanguage } from "@/hooks/useLanguage";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  user_id: string;
  user_name: string | null;
  user_role: string | null;
  action_type: string;
  module: string;
  rule_set: string | null;
  jurisdiction: string | null;
  broker_id: string | null;
  field_changed: string;
  old_value: any;
  new_value: any;
  reason: string | null;
  status: string;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  approval_status: string | null;
  created_at: string;
}

const MODULE_OPTIONS = [
  "scoring_formula", "threshold", "jurisdiction", "eu_overlay",
  "broker_routing", "escalation_routing", "contact_directory",
  "rule_engine", "permissions", "document_requirements"
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-risk-low/20 text-risk-low border-risk-low/30",
  draft: "bg-muted text-muted-foreground border-border",
  reverted: "bg-destructive/20 text-destructive border-destructive/30",
  pending_approval: "bg-risk-medium/20 text-risk-medium border-risk-medium/30",
};

const APPROVAL_ICONS: Record<string, typeof CheckCircle2> = {
  approved: CheckCircle2,
  pending: Clock,
  rejected: XCircle,
  not_required: Eye,
};

export default function AuditTrail() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollbackTarget, setRollbackTarget] = useState<AuditEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["audit-trail", moduleFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("logic_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (moduleFilter !== "all") query = query.eq("module", moduleFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AuditEntry[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("logic_audit_log")
        .update({
          approval_status: approved ? "approved" : "rejected",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          status: approved ? "active" : "draft",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-trail"] });
      toast.success("Approval updated");
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (entry: AuditEntry) => {
      // Mark original as reverted
      await supabase
        .from("logic_audit_log")
        .update({ status: "reverted" })
        .eq("id", entry.id);
      // Insert rollback event
      const { error } = await supabase.from("logic_audit_log").insert({
        user_id: user?.id,
        user_name: user?.email,
        user_role: "admin",
        action_type: "rollback",
        module: entry.module,
        rule_set: entry.rule_set,
        jurisdiction: entry.jurisdiction,
        field_changed: entry.field_changed,
        old_value: entry.new_value,
        new_value: entry.old_value,
        reason: rollbackReason || `Rollback of change ${entry.id.slice(0, 8)}`,
        status: "active",
        requires_approval: false,
        approval_status: "not_required",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-trail"] });
      toast.success("Change rolled back");
      setRollbackTarget(null);
      setRollbackReason("");
    },
  });

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.field_changed.toLowerCase().includes(q) ||
      e.module.toLowerCase().includes(q) ||
      e.user_name?.toLowerCase().includes(q) ||
      e.reason?.toLowerCase().includes(q) ||
      e.jurisdiction?.toLowerCase().includes(q)
    );
  });

  const renderValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-muted-foreground/50 italic">null</span>;
    if (typeof val === "object") return <pre className="text-xs font-mono whitespace-pre-wrap max-h-40 overflow-auto bg-secondary/50 rounded p-2">{JSON.stringify(val, null, 2)}</pre>;
    return <span className="font-mono text-sm">{String(val)}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <History size={18} className="text-primary" />
          <h1 className="text-lg font-bold">{t("audit.pageTitle")}</h1>
          <Badge variant="outline" className="ml-auto font-mono text-[10px]">
            {filtered.length} {t("audit.entries")}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("audit.searchPlaceholder")}
              className="pl-8 h-9 text-xs bg-secondary/50"
            />
          </div>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs bg-secondary/50">
              <Filter size={12} className="mr-1" />
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("audit.allModules")}</SelectItem>
              {MODULE_OPTIONS.map((m) => (
                <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9 text-xs bg-secondary/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("audit.allStatuses")}</SelectItem>
              <SelectItem value="active">{t("status.approved")}</SelectItem>
              <SelectItem value="draft">{t("status.draft")}</SelectItem>
              <SelectItem value="reverted">{t("audit.reverted")}</SelectItem>
              <SelectItem value="pending_approval">{t("status.pending")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Log Table */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground font-mono text-sm animate-pulse">
            {t("audit.loading")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <History size={32} className="mx-auto mb-3 opacity-30" />
             <p className="text-sm">{t("audit.noEntries")}</p>
             <p className="text-xs mt-1">{t("audit.noEntriesHint")}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const ApprovalIcon = APPROVAL_ICONS[entry.approval_status || "not_required"] || Eye;
              return (
                <div key={entry.id} className="rounded-lg border border-border bg-card overflow-hidden">
                  {/* Row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-primary">{entry.module.replace(/_/g, " ").toUpperCase()}</span>
                        <span className="text-xs text-muted-foreground">›</span>
                        <span className="text-sm font-medium truncate">{entry.field_changed}</span>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[entry.status] || ""}`}>
                          {entry.status}
                        </Badge>
                        {entry.requires_approval && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <ApprovalIcon size={10} />
                            {entry.approval_status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span>{entry.user_name || entry.user_id.slice(0, 8)}</span>
                        {entry.user_role && <span className="font-mono">[{entry.user_role}]</span>}
                        <span>{format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}</span>
                        {entry.jurisdiction && <span className="text-primary/70">{entry.jurisdiction}</span>}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground/50">{entry.action_type}</span>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-4 bg-secondary/10 space-y-4">
                      {/* Side-by-side diff */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-mono text-[10px] text-destructive/70 mb-1">{t("audit.oldValue")}</p>
                          <div className="rounded border border-destructive/20 p-3 bg-destructive/5 min-h-[60px]">
                            {renderValue(entry.old_value)}
                          </div>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] text-risk-low/70 mb-1">{t("audit.newValue")}</p>
                          <div className="rounded border border-risk-low/20 p-3 bg-risk-low/5 min-h-[60px]">
                            {renderValue(entry.new_value)}
                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground/70 mb-0.5">{t("audit.action")}</p>
                          <p className="font-mono">{entry.action_type}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground/70 mb-0.5">{t("audit.ruleSet")}</p>
                          <p className="font-mono">{entry.rule_set || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground/70 mb-0.5">{t("intake.jurisdiction")}</p>
                          <p className="font-mono">{entry.jurisdiction || "Global"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground/70 mb-0.5">Entry ID</p>
                          <p className="font-mono text-muted-foreground/50">{entry.id.slice(0, 12)}</p>
                        </div>
                      </div>

                      {/* Reason */}
                      {entry.reason && (
                        <div className="text-xs">
                          <p className="text-muted-foreground/70 mb-0.5">{t("audit.reason")}</p>
                          <p className="bg-secondary/50 rounded p-2 border border-border">{entry.reason}</p>
                        </div>
                      )}

                      {/* Approval info */}
                      {entry.requires_approval && entry.approved_by && (
                        <div className="text-xs flex items-center gap-3 text-muted-foreground">
                          <Shield size={12} />
                          <span>Approved by {entry.approved_by.slice(0, 8)} at {entry.approved_at ? format(new Date(entry.approved_at), "MMM d, yyyy HH:mm") : "—"}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setDetailEntry(entry)}>
                          <Eye size={12} className="mr-1" /> {t("audit.fullDetails")}
                        </Button>
                        {isAdmin && entry.requires_approval && entry.approval_status === "pending" && (
                          <>
                            <Button
                              size="sm" className="text-xs h-7 gap-1"
                              onClick={() => approveMutation.mutate({ id: entry.id, approved: true })}
                            >
                              <CheckCircle2 size={12} /> {t("audit.approve")}
                            </Button>
                            <Button
                              variant="destructive" size="sm" className="text-xs h-7 gap-1"
                              onClick={() => approveMutation.mutate({ id: entry.id, approved: false })}
                            >
                              <XCircle size={12} /> {t("audit.reject")}
                            </Button>
                          </>
                        )}
                        {isAdmin && entry.status === "active" && (
                          <Button
                            variant="outline" size="sm" className="text-xs h-7 gap-1 text-destructive"
                            onClick={() => setRollbackTarget(entry)}
                          >
                            <RotateCcw size={12} /> {t("audit.rollback")}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Full Detail Dialog */}
      <Dialog open={!!detailEntry} onOpenChange={() => setDetailEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              AUDIT ENTRY — {detailEntry?.id.slice(0, 12)}
            </DialogTitle>
          </DialogHeader>
          {detailEntry && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries({
                  "User": detailEntry.user_name || detailEntry.user_id.slice(0, 12),
                  "Role": detailEntry.user_role || "—",
                  "Action": detailEntry.action_type,
                  "Module": detailEntry.module,
                  "Field": detailEntry.field_changed,
                  "Rule Set": detailEntry.rule_set || "—",
                  "Jurisdiction": detailEntry.jurisdiction || "Global",
                  "Status": detailEntry.status,
                  "Approval": detailEntry.approval_status || "not_required",
                  "Created": format(new Date(detailEntry.created_at), "PPpp"),
                }).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10px] text-muted-foreground font-mono">{k.toUpperCase()}</p>
                    <p>{v}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[10px] text-destructive/70 mb-1">OLD VALUE</p>
                  <div className="rounded border border-destructive/20 p-3 bg-destructive/5">
                    {renderValue(detailEntry.old_value)}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-risk-low/70 mb-1">NEW VALUE</p>
                  <div className="rounded border border-risk-low/20 p-3 bg-risk-low/5">
                    {renderValue(detailEntry.new_value)}
                  </div>
                </div>
              </div>
              {detailEntry.reason && (
                <div>
                  <p className="text-[10px] text-muted-foreground font-mono">REASON</p>
                  <p className="mt-1">{detailEntry.reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={!!rollbackTarget} onOpenChange={() => setRollbackTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <RotateCcw size={16} /> {t("audit.confirmRollback")}
            </DialogTitle>
          </DialogHeader>
          {rollbackTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will revert <strong>{rollbackTarget.field_changed}</strong> in{" "}
                <strong>{rollbackTarget.module}</strong> back to its previous value and log the rollback.
              </p>
              <Textarea
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                placeholder="Reason for rollback (required for audit)..."
                rows={3}
                className="bg-secondary/50"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setRollbackTarget(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => rollbackMutation.mutate(rollbackTarget)}
                  disabled={rollbackMutation.isPending}
                >
                  <RotateCcw size={14} className="mr-1" /> Rollback
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
