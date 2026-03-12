import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, Shield, UserPlus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRole, AppRole } from "@/hooks/useRole";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  ops_manager: "Ops Manager",
  analyst: "Analyst",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-destructive/20 text-destructive border-destructive/30",
  ops_manager: "bg-primary/20 text-primary border-primary/30",
  analyst: "bg-accent text-accent-foreground border-border",
  viewer: "bg-muted text-muted-foreground border-border",
};

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [prompt, setPrompt] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("analyst");

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_settings").select("*").limit(1).single();
      if (error) throw error;
      setPrompt(data.system_prompt);
      return data;
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data as unknown as { id: string; user_id: string; role: AppRole; granted_at: string }[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, company_name");
      if (error) return [];
      return data;
    },
    enabled: isAdmin,
  });

  const promptMutation = useMutation({
    mutationFn: async (newPrompt: string) => {
      if (!settings) return;
      const { error } = await supabase
        .from("admin_settings")
        .update({ system_prompt: newPrompt })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("System prompt updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role,
        granted_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      toast.success("Role assigned");
      setNewEmail("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to assign role"),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      toast.success("Role removed");
    },
    onError: () => toast.error("Failed to remove role"),
  });

  const handleAddRole = async () => {
    if (!newEmail.trim()) return;
    // Look up user by email from profiles — we match on full_name or find the user
    // For simplicity, we search profiles matching the email-like input
    const profile = profiles.find(
      (p) => p.full_name?.toLowerCase() === newEmail.toLowerCase() || p.id === newEmail
    );
    if (!profile) {
      toast.error("User not found. Enter their exact display name or user ID.");
      return;
    }
    addRoleMutation.mutate({ userId: profile.id, role: newRole });
  };

  const getProfileName = (userId: string) => {
    const p = profiles.find((pr) => pr.id === userId);
    return p?.full_name || userId.slice(0, 8) + "...";
  };

  // Group roles by user
  const userRoleMap = new Map<string, { id: string; role: AppRole }[]>();
  allRoles.forEach((r) => {
    const existing = userRoleMap.get(r.user_id) || [];
    existing.push({ id: r.id, role: r.role });
    userRoleMap.set(r.user_id, existing);
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <Shield size={18} className="text-primary" />
          <h1 className="text-lg font-bold">Admin Control Center</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Tabs defaultValue="team">
          <TabsList className="bg-secondary/50 border border-border">
            <TabsTrigger value="team" className="font-mono text-xs"><Users size={12} className="mr-1" /> TEAM</TabsTrigger>
            <TabsTrigger value="rules" className="font-mono text-xs"><Shield size={12} className="mr-1" /> AI RULES</TabsTrigger>
            <TabsTrigger value="integrations" className="font-mono text-xs">INTEGRATIONS</TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="mt-4 space-y-6">
            {/* Add Role */}
            {isAdmin && (
              <div className="rounded-lg border border-border bg-card p-6 space-y-4">
                <h3 className="font-mono text-xs text-muted-foreground">ASSIGN ROLE TO TEAM MEMBER</h3>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Display Name or User ID</label>
                    <Input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. John Smith"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="w-[160px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                    <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddRole} disabled={addRoleMutation.isPending} className="gap-1">
                    <UserPlus size={14} /> Assign
                  </Button>
                </div>
              </div>
            )}

            {/* Team Members */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h3 className="font-mono text-xs text-muted-foreground">TEAM MEMBERS & PERMISSIONS</h3>
              {userRoleMap.size === 0 ? (
                <p className="text-sm text-muted-foreground">No roles assigned yet. The first admin must be assigned via the database.</p>
              ) : (
                <div className="space-y-3">
                  {Array.from(userRoleMap.entries()).map(([userId, userRoles]) => (
                    <div key={userId} className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border">
                      <div>
                        <p className="text-sm font-medium">{getProfileName(userId)}</p>
                        <p className="text-xs text-muted-foreground font-mono">{userId.slice(0, 12)}...</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {userRoles.map((r) => (
                          <div key={r.id} className="flex items-center gap-1">
                            <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[r.role]}`}>
                              {ROLE_LABELS[r.role]}
                            </Badge>
                            {isAdmin && userId !== user?.id && (
                              <button
                                onClick={() => removeRoleMutation.mutate(r.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Role Permission Matrix */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h3 className="font-mono text-xs text-muted-foreground">PERMISSION MATRIX</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-mono">CAPABILITY</th>
                      <th className="text-center py-2 text-muted-foreground font-mono">ADMIN</th>
                      <th className="text-center py-2 text-muted-foreground font-mono">OPS MGR</th>
                      <th className="text-center py-2 text-muted-foreground font-mono">ANALYST</th>
                      <th className="text-center py-2 text-muted-foreground font-mono">VIEWER</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[
                      ["Manage team roles", true, false, false, false],
                      ["Edit AI rules & thresholds", true, false, false, false],
                      ["Override broker attribution", true, true, false, false],
                      ["Assign watchlist tags", true, true, false, false],
                      ["Export reports", true, true, true, false],
                      ["Change shipment status", true, true, true, false],
                      ["Add comments & notes", true, true, true, false],
                      ["Upload documents", true, true, true, false],
                      ["View scorecards", true, true, true, true],
                      ["View shipments", true, true, true, true],
                    ].map(([cap, ...perms], i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 text-muted-foreground">{cap as string}</td>
                        {(perms as boolean[]).map((p, j) => (
                          <td key={j} className="text-center py-2">
                            {p ? <span className="text-risk-safe">●</span> : <span className="text-muted-foreground/30">○</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rules" className="mt-4 space-y-6">
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div>
                <h3 className="font-mono text-xs text-muted-foreground mb-1">COMPLIANCE AI — SYSTEM PROMPT</h3>
                <p className="text-xs text-muted-foreground">
                  This prompt governs how the AI analyzes shipments against your Legal Knowledge database.
                </p>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={12}
                className="font-mono text-sm bg-secondary/50 border-border"
                placeholder="Enter system prompt..."
              />
              <Button
                onClick={() => promptMutation.mutate(prompt)}
                disabled={promptMutation.isPending}
                className="gap-2"
              >
                <Save size={14} /> Save Prompt
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="mt-4">
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h3 className="font-mono text-xs text-muted-foreground">API INTEGRATION STATUS</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Google Document AI</span>
                  <span className="font-mono text-xs text-risk-medium">PENDING SETUP</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Make.com Webhook</span>
                  <span className="font-mono text-xs text-risk-safe">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Legal Scraper (Make.com)</span>
                  <span className="font-mono text-xs text-risk-medium">PENDING SETUP</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
