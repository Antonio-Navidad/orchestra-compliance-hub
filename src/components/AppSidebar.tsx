/**
 * AppSidebar — dark navy #0f1623, spec-exact navigation
 */
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Shield, AlertTriangle, Tag, Search,
  BookOpen, ClipboardList, Settings, LogOut, Zap, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { label: "Shipments",       path: "/dashboard",   icon: LayoutDashboard },
  { label: "Validate",        path: "/validate",     icon: Shield },
  { label: "Exceptions",      path: "/review",       icon: AlertTriangle,  badge: true },
  { label: "HTS Classifier",  path: "/classify",     icon: Tag },
  { label: "OFAC Screen",     path: "/ofac",         icon: Search },
  { label: "Compliance Rules",path: "/compliance-engine", icon: BookOpen },
  { label: "Audit Trail",     path: "/audit-trail",  icon: ClipboardList },
  { label: "Settings",        path: "/admin",        icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { creditsRemaining, isSubscribed } = useCredits();

  const company = (user as any)?.user_metadata?.company_name || "My Workspace";

  return (
    <aside className="h-screen w-56 flex flex-col shrink-0" style={{ backgroundColor: "#0f1623", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(96,165,250,0.3)" }}>
            <Shield className="h-4 w-4" style={{ color: "#60a5fa" }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Orchestra AI</p>
            <p className="text-[9px] font-mono tracking-widest mt-0.5" style={{ color: "rgba(96,165,250,0.5)" }}>COMPLIANCE</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {NAV.map(({ label, path, icon: Icon, badge }) => {
          const active = location.pathname === path || (path !== "/dashboard" && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors group",
                active
                  ? "text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
              style={active ? { backgroundColor: "rgba(59,130,246,0.15)", color: "#fff" } : {}}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
              <span className="flex-1 truncate">{label}</span>
              {badge && (
                <Badge className="h-4 min-w-[16px] px-1 text-[10px] font-bold bg-red-500 text-white border-0 rounded-full">
                  !
                </Badge>
              )}
              {active && <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "#60a5fa" }} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t space-y-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {/* Credit indicator */}
        <div className="px-3 py-2.5 rounded-md" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-400 truncate max-w-[110px]">{company}</span>
            {isSubscribed
              ? <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400"><Zap className="h-3 w-3"/>Pro</span>
              : <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: creditsRemaining === 0 ? "#ef4444" : creditsRemaining <= 2 ? "#f59e0b" : "#94a3b8" }}>
                  <Sparkles className="h-3 w-3"/>
                  {creditsRemaining}/{5} free
                </span>
            }
          </div>
          {!isSubscribed && (
            <div className="w-full h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-1 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (creditsRemaining / 5) * 100)}%`,
                  backgroundColor: creditsRemaining === 0 ? "#ef4444" : creditsRemaining <= 2 ? "#f59e0b" : "#60a5fa",
                }}
              />
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={() => { signOut(); navigate("/auth"); }}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
