import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Activity, ArrowRight, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [compliancePulse, setCompliancePulse] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, company_name: companyName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // Update compliance pulse after signup
      toast({
        title: "Check your email",
        description: "We've sent you a verification link. Please confirm your email to continue.",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-primary/20 flex items-center justify-center">
              <Activity size={22} className="text-primary" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold tracking-tight">ORCHESTRA</h1>
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest">LOGISTICS COMPLIANCE PLATFORM</p>
            </div>
          </div>
        </div>

        <Card className="border-border/50 glow-blue">
          <Tabs defaultValue="signin">
            <CardHeader>
              <TabsList className="w-full bg-secondary/50 border border-border">
                <TabsTrigger value="signin" className="flex-1 font-mono text-xs">SIGN IN</TabsTrigger>
                <TabsTrigger value="signup" className="flex-1 font-mono text-xs">CREATE ACCOUNT</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] text-muted-foreground tracking-wider">EMAIL</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@company.com" required />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] text-muted-foreground tracking-wider">PASSWORD</label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" className="w-full font-mono" disabled={loading}>
                    {loading ? "AUTHENTICATING..." : "ACCESS PLATFORM"} <ArrowRight size={14} />
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] text-muted-foreground tracking-wider">FULL NAME</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] text-muted-foreground tracking-wider">COMPANY</label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Logistics Inc." />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] text-muted-foreground tracking-wider">EMAIL</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@company.com" required />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] text-muted-foreground tracking-wider">PASSWORD</label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} required />
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                    <Checkbox
                      id="compliance-pulse"
                      checked={compliancePulse}
                      onCheckedChange={(c) => setCompliancePulse(c as boolean)}
                      className="mt-0.5"
                    />
                    <label htmlFor="compliance-pulse" className="text-xs leading-relaxed cursor-pointer">
                      <span className="font-semibold text-primary">Compliance Pulse™</span> — Opt-in to automated world trade news and app updates delivered weekly via email.
                    </label>
                  </div>

                  <Button type="submit" className="w-full font-mono" disabled={loading}>
                    {loading ? "CREATING ACCOUNT..." : "DEPLOY ACCOUNT"} <Shield size={14} />
                  </Button>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground font-mono">
          SECURED BY ENTERPRISE-GRADE ENCRYPTION · SOC 2 COMPLIANT
        </p>
      </div>
    </div>
  );
}
