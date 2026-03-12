import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("type") === "recovery") {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      navigate("/auth");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground text-sm">Invalid or expired recovery link.</p>
            <Button variant="outline" onClick={() => navigate("/auth")} className="font-mono text-xs">
              BACK TO LOGIN
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-primary/20 flex items-center justify-center">
              <Activity size={22} className="text-primary" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold tracking-tight">ORCHESTRA</h1>
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest">SET NEW PASSWORD</p>
            </div>
          </div>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <Lock size={16} /> RESET PASSWORD
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleReset}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="font-mono text-[10px] text-muted-foreground tracking-wider">NEW PASSWORD</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} required />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[10px] text-muted-foreground tracking-wider">CONFIRM PASSWORD</label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" minLength={6} required />
              </div>
              <Button type="submit" className="w-full font-mono" disabled={loading}>
                {loading ? "UPDATING..." : "UPDATE PASSWORD"}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
