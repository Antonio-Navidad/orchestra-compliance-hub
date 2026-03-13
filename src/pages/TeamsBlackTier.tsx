import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Shield, FileText, Map, Activity, Clock, Crown,
  UserPlus, Search, MoreHorizontal, Check, X, ChevronDown
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

type Role = "owner" | "admin" | "manager" | "analyst" | "viewer";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "invited" | "suspended";
  lastActive: string;
  shipmentsAccess: number;
}

const MOCK_MEMBERS: TeamMember[] = [
  { id: "1", name: "Carlos Méndez", email: "carlos@orchestra.io", role: "owner", status: "active", lastActive: "Now", shipmentsAccess: 284 },
  { id: "2", name: "Ana Rodríguez", email: "ana@orchestra.io", role: "admin", status: "active", lastActive: "2m ago", shipmentsAccess: 284 },
  { id: "3", name: "Miguel Torres", email: "miguel@orchestra.io", role: "manager", status: "active", lastActive: "1h ago", shipmentsAccess: 156 },
  { id: "4", name: "Laura Chen", email: "laura@orchestra.io", role: "analyst", status: "active", lastActive: "3h ago", shipmentsAccess: 89 },
  { id: "5", name: "James Wilson", email: "james@orchestra.io", role: "viewer", status: "invited", lastActive: "—", shipmentsAccess: 0 },
];

const PERMISSIONS = [
  { key: "view_shipments", label: "View Shipments" },
  { key: "edit_shipments", label: "Edit Shipments" },
  { key: "approve_routes", label: "Approve Routes" },
  { key: "edit_templates", label: "Edit Templates" },
  { key: "manage_alerts", label: "Manage Alerts" },
  { key: "manage_team", label: "Manage Team" },
  { key: "promote_admin", label: "Promote to Admin" },
  { key: "export_data", label: "Export Data" },
  { key: "manage_integrations", label: "Manage Integrations" },
  { key: "creator_mode_access", label: "Creator Mode Access" },
  { key: "configure_workflows", label: "Configure Workflows" },
];

const PERMISSION_MATRIX: Record<Role, Record<string, boolean>> = {
  owner: Object.fromEntries(PERMISSIONS.map(p => [p.key, true])),
  admin: Object.fromEntries(PERMISSIONS.map(p => [p.key, p.key !== "promote_admin"])),
  manager: {
    view_shipments: true, edit_shipments: true, approve_routes: true,
    edit_templates: true, manage_alerts: true, manage_team: false,
    promote_admin: false, export_data: true, manage_integrations: false,
    creator_mode_access: true, configure_workflows: true,
  },
  analyst: {
    view_shipments: true, edit_shipments: false, approve_routes: false,
    edit_templates: false, manage_alerts: false, manage_team: false,
    promote_admin: false, export_data: true, manage_integrations: false,
    creator_mode_access: false, configure_workflows: false,
  },
  viewer: {
    view_shipments: true, edit_shipments: false, approve_routes: false,
    edit_templates: false, manage_alerts: false, manage_team: false,
    promote_admin: false, export_data: false, manage_integrations: false,
    creator_mode_access: false, configure_workflows: false,
  },
};

const MOCK_ACTIVITY = [
  { id: "1", user: "Ana Rodríguez", action: "Changed role for Miguel Torres to Manager", time: "2h ago", type: "role_change" },
  { id: "2", user: "Carlos Méndez", action: "Approved route for SHP-2024-0891", time: "4h ago", type: "approval" },
  { id: "3", user: "Miguel Torres", action: "Shared compliance template 'CO→US Standard'", time: "6h ago", type: "template" },
  { id: "4", user: "Laura Chen", action: "Exported analytics report Q1 2026", time: "1d ago", type: "export" },
  { id: "5", user: "Ana Rodríguez", action: "Invited james@orchestra.io as Viewer", time: "2d ago", type: "invite" },
];

const SHARED_TEMPLATES = [
  { id: "1", name: "CO→US Standard Route", type: "route", sharedBy: "Carlos Méndez", usedCount: 42 },
  { id: "2", name: "DIAN Import Packet", type: "compliance", sharedBy: "Ana Rodríguez", usedCount: 67 },
  { id: "3", name: "Electronics HS Template", type: "product", sharedBy: "Miguel Torres", usedCount: 28 },
  { id: "4", name: "Sea Freight Doc Checklist", type: "compliance", sharedBy: "Laura Chen", usedCount: 35 },
];

const roleColor: Record<Role, string> = {
  owner: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  admin: "bg-primary/15 text-primary border-primary/30",
  manager: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  analyst: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

const statusColor: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600",
  invited: "bg-amber-500/15 text-amber-600",
  suspended: "bg-destructive/15 text-destructive",
};

export default function TeamsBlackTier() {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("manager");

  const filteredMembers = MOCK_MEMBERS.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h1 className="text-xl font-bold tracking-tight">Teams & Enterprise</h1>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-mono">
              BLACK TIER
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Manage team members, roles, permissions, and shared resources
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Invite Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Team Members", value: "5", icon: Users, sub: "3 active" },
          { label: "Roles Defined", value: "5", icon: Shield, sub: "0 custom" },
          { label: "Shared Templates", value: "4", icon: FileText, sub: "172 total uses" },
          { label: "Actions (7d)", value: "23", icon: Activity, sub: "5 approvals" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{s.label}</span>
              </div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="members" className="text-xs gap-1"><Users className="h-3 w-3" />Members</TabsTrigger>
          <TabsTrigger value="permissions" className="text-xs gap-1"><Shield className="h-3 w-3" />Permissions</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs gap-1"><FileText className="h-3 w-3" />Templates</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1"><Activity className="h-3 w-3" />Activity</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          <Card className="border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="text-[10px] font-mono">
                  <TableHead className="text-[10px]">Member</TableHead>
                  <TableHead className="text-[10px]">Role</TableHead>
                  <TableHead className="text-[10px]">Status</TableHead>
                  <TableHead className="text-[10px] hidden md:table-cell">Last Active</TableHead>
                  <TableHead className="text-[10px] hidden md:table-cell">Shipments</TableHead>
                  <TableHead className="text-[10px] w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map(m => (
                  <TableRow key={m.id} className="text-xs">
                    <TableCell>
                      <div>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground">{m.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-mono ${roleColor[m.role]}`}>
                        {m.role === "owner" && <Crown className="h-2.5 w-2.5 mr-1" />}
                        {m.role.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] ${statusColor[m.status]}`}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-[10px]">
                      {m.lastActive}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-[10px]">
                      {m.shipmentsAccess}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Permissions Matrix Tab */}
        <TabsContent value="permissions" className="space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono text-muted-foreground">Viewing role:</span>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["owner", "admin", "manager", "analyst", "viewer"] as Role[]).map(r => (
                  <SelectItem key={r} value={r} className="text-xs">{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-border/50 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-mono">Permission</TableHead>
                  {(["owner", "admin", "manager", "analyst", "viewer"] as Role[]).map(r => (
                    <TableHead key={r} className={`text-[10px] font-mono text-center ${r === selectedRole ? "bg-primary/5" : ""}`}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSIONS.map(p => (
                  <TableRow key={p.key} className="text-xs">
                    <TableCell className="font-medium text-xs">{p.label}</TableCell>
                    {(["owner", "admin", "manager", "analyst", "viewer"] as Role[]).map(r => (
                      <TableCell key={r} className={`text-center ${r === selectedRole ? "bg-primary/5" : ""}`}>
                        {PERMISSION_MATRIX[r][p.key] ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="border-border/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Custom Role Builder</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Create custom roles with granular permission control</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs gap-1">
                <Shield className="h-3 w-3" /> Create Custom Role
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Shared Templates Tab */}
        <TabsContent value="templates" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SHARED_TEMPLATES.map(t => (
              <Card key={t.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {t.type === "route" ? <Map className="h-4 w-4 text-primary" /> :
                       t.type === "product" ? <Search className="h-4 w-4 text-amber-500" /> :
                       <Shield className="h-4 w-4 text-emerald-500" />}
                      <div>
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Shared by {t.sharedBy}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {t.type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Used {t.usedCount} times
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-dashed border-2 border-border/50 p-6 flex flex-col items-center justify-center text-center">
            <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium">Share a Template</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Share route, compliance, or product templates with your team
            </p>
            <Button variant="outline" size="sm" className="mt-3 text-xs">
              Share Template
            </Button>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-3">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {MOCK_ACTIVITY.map(a => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                      a.type === "role_change" ? "bg-primary/10 text-primary" :
                      a.type === "approval" ? "bg-emerald-500/10 text-emerald-500" :
                      a.type === "template" ? "bg-amber-500/10 text-amber-500" :
                      a.type === "export" ? "bg-sky-500/10 text-sky-500" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {a.type === "role_change" ? <Shield className="h-3.5 w-3.5" /> :
                       a.type === "approval" ? <Check className="h-3.5 w-3.5" /> :
                       a.type === "template" ? <FileText className="h-3.5 w-3.5" /> :
                       a.type === "export" ? <Activity className="h-3.5 w-3.5" /> :
                       <UserPlus className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs">
                        <span className="font-medium">{a.user}</span>{" "}
                        <span className="text-muted-foreground">{a.action}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono shrink-0">
                      <Clock className="h-3 w-3" />
                      {a.time}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Escalation Controls */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Alert & Escalation Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Auto-escalate high-risk shipments to admins", enabled: true },
            { label: "Require manager approval for Decision Twin overrides", enabled: true },
            { label: "Notify team on customs hold events", enabled: false },
            { label: "Restrict Creator Mode to admin-only", enabled: false },
          ].map((ctrl, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs">{ctrl.label}</span>
              <Switch defaultChecked={ctrl.enabled} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
