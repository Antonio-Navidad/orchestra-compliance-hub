/**
 * Auth — Login, Sign Up, Forgot Password
 * Views: "login" | "signup" | "forgot" | "forgot-sent"
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Lock, Mail, User, Building2 } from "lucide-react";
import { toast } from "sonner";

type View = "login" | "signup" | "forgot" | "forgot-sent";

export default function Auth() {
  const [view, setView]           = useState<View>("login");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [fullName, setFullName]   = useState("");
  const [companyName, setCompany] = useState("");
  const [loading, setLoading]     = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    navigate("/dashboard");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, company_name: companyName }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data.user?.identities?.length === 0) { toast.error("Email already registered — sign in instead."); setView("login"); return; }
    toast.success("Check your email for a verification link.");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setView("forgot-sent");
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-between w-[460px] shrink-0 p-12" style={{backgroundColor:"#0f1623"}}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{background:"rgba(59,130,246,0.15)",border:"1px solid rgba(96,165,250,0.3)"}}>
            <Shield className="h-5 w-5" style={{color:"#60a5fa"}} />
          </div>
          <div>
            <p className="font-bold text-white text-base tracking-tight">Orchestra AI</p>
            <p className="text-[10px] font-mono tracking-widest" style={{color:"rgba(96,165,250,0.6)"}}>COMPLIANCE PLATFORM</p>
          </div>
        </div>
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight text-white">Trade compliance,<br/>automated.</h2>
            <p className="mt-3 text-sm leading-relaxed" style={{color:"#94a3b8"}}>
              Cross-reference BOLs, commercial invoices, and packing lists in under 90 seconds. Catch exceptions before they become customs holds.
            </p>
          </div>
          <div className="space-y-4">
            {[
              {label:"Document cross-referencing",sub:"AI-powered discrepancy detection"},
              {label:"OFAC sanctions screening",sub:"Real-time entity risk scoring"},
              {label:"HTS code classification",sub:"Automated tariff classification"},
              {label:"Full audit trail",sub:"Every action logged and exportable"},
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{color:"#60a5fa"}} />
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs" style={{color:"#64748b"}}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] font-mono" style={{color:"#475569"}}>Enterprise-grade encryption · SOC 2 Type II</p>
      </div>

      {/* RIGHT FORM */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Shield className="h-6 w-6 text-primary" /><span className="font-bold text-lg">Orchestra AI</span>
          </div>

          {view === "login" && (
            <form onSubmit={handleSignIn} className="space-y-5">
              <div><h1 className="text-2xl font-bold">Welcome back</h1><p className="text-sm text-muted-foreground mt-1">Sign in to your compliance workspace</p></div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider">Email</label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" className="pl-9" required /></div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider">Password</label>
                    <button type="button" onClick={()=>setView("forgot")} className="text-xs text-primary hover:underline">Forgot password?</button>
                  </div>
                  <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="pl-9" required /></div>
                </div>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>{loading?<Loader2 className="h-4 w-4 animate-spin"/>:<ArrowRight className="h-4 w-4"/>}{loading?"Signing in…":"Sign in"}</Button>
              <p className="text-center text-sm text-muted-foreground">Don't have an account?{" "}<button type="button" onClick={()=>setView("signup")} className="text-primary font-semibold hover:underline">Create one</button></p>
            </form>
          )}

          {view === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-5">
              <div><h1 className="text-2xl font-bold">Create your account</h1><p className="text-sm text-muted-foreground mt-1">5 free validations — no card required</p></div>
              <div className="space-y-3">
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider">Full Name</label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Jane Smith" className="pl-9" required/></div></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider">Company</label><div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input value={companyName} onChange={e=>setCompany(e.target.value)} placeholder="Acme Logistics" className="pl-9"/></div></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider">Email</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" className="pl-9" required/></div></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider">Password</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 8 characters" minLength={8} className="pl-9" required/></div></div>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>{loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Shield className="h-4 w-4"/>}{loading?"Creating account…":"Create account — it's free"}</Button>
              <p className="text-center text-sm text-muted-foreground">Already have an account?{" "}<button type="button" onClick={()=>setView("login")} className="text-primary font-semibold hover:underline">Sign in</button></p>
            </form>
          )}

          {view === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-5">
              <button type="button" onClick={()=>setView("login")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5"/>Back to sign in</button>
              <div><h1 className="text-2xl font-bold">Reset your password</h1><p className="text-sm text-muted-foreground mt-1">Enter your email and we'll send a reset link.</p></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider">Email</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" className="pl-9" required/></div></div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>{loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Mail className="h-4 w-4"/>}{loading?"Sending…":"Send reset link"}</Button>
            </form>
          )}

          {view === "forgot-sent" && (
            <div className="text-center space-y-5">
              <div className="inline-flex h-14 w-14 rounded-full bg-emerald-100 items-center justify-center"><CheckCircle2 className="h-7 w-7 text-emerald-600"/></div>
              <div><h1 className="text-2xl font-bold">Check your inbox</h1><p className="text-sm text-muted-foreground mt-2">We sent a reset link to <span className="font-semibold text-foreground">{email}</span>. Expires in 1 hour.</p></div>
              <Button variant="outline" className="w-full" onClick={()=>setView("login")}>Back to sign in</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
