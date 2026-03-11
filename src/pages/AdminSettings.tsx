import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_settings").select("*").limit(1).single();
      if (error) throw error;
      setPrompt(data.system_prompt);
      return data;
    },
  });

  const mutation = useMutation({
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold">Admin Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
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
            onClick={() => mutation.mutate(prompt)}
            disabled={mutation.isPending}
            className="gap-2"
          >
            <Save size={14} /> Save Prompt
          </Button>
        </div>

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
      </main>
    </div>
  );
}
