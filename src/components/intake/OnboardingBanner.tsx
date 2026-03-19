import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const BANNER_KEY = "orchestra-intake-onboarding-dismissed";

export function OnboardingBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check localStorage first for quick dismiss
    if (localStorage.getItem(BANNER_KEY) === "true") return;

    // Check if user has any shipments
    async function check() {
      if (!user) { setVisible(true); return; }
      const { count } = await supabase.from("shipments").select("*", { count: "exact", head: true });
      if (!count || count === 0) setVisible(true);
    }
    check();
  }, [user]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(BANNER_KEY, "true");
  };

  return (
    <div className="relative rounded-lg border border-primary/30 bg-primary/5 p-4 mb-6">
      <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <Sparkles className="text-primary shrink-0 mt-0.5" size={20} />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Welcome to Orchestra's AI-Powered Intake</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This form creates your shipment record and activates Orchestra's AI compliance engine. As you fill in each field, 
            Orchestra checks your data in real time against customs requirements for your lane, flags risks before they become 
            fines, and tells you exactly what documents you need and why. The panel on the right shows your live compliance 
            readiness score — aim for green before submitting.
          </p>
        </div>
      </div>
    </div>
  );
}
