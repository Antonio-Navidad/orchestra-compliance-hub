import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ComplianceCoachProps {
  shipmentContext: {
    originCountry: string;
    destinationCountry: string;
    mode: string;
    hsCode: string;
    description: string;
    declaredValue: string;
    currency: string;
    incoterm: string;
    cooStatus: string;
  };
}

const SUGGESTIONS = [
  "Do I need a fumigation certificate for this shipment?",
  "What is the duty rate for my product?",
  "Why is my description quality low?",
  "What happens if I don't have a certificate of origin?",
  "Is my HS code correct?",
];

export function ComplianceCoach({ shipmentContext }: ComplianceCoachProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const ask = async (question: string) => {
    if (!question.trim()) return;
    const userMsg: Message = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("intake-validate", {
        body: {
          action: "coach",
          question,
          ...shipmentContext,
        },
      });
      if (error) throw error;
      setMessages(prev => [...prev, { role: "assistant", content: data.answer || "I couldn't generate a response." }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    }
    setLoading(false);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-primary" />
            <span className="font-mono text-xs font-medium">AI COMPLIANCE COACH</span>
            <Badge variant="outline" className="text-[9px] font-mono">AI</Badge>
          </div>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border border-t-0 border-border rounded-b-lg p-3 space-y-3 bg-card">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Ask questions about your specific shipment. The coach uses your current lane, mode, and product data.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => ask(s)}
                    className="text-[10px] px-2 py-1 rounded-full border border-border bg-secondary/50 hover:bg-primary/10 hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div ref={scrollRef} className="max-h-[300px] overflow-y-auto space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`text-xs p-2 rounded-md ${
                  m.role === "user" ? "bg-primary/10 text-foreground ml-8" : "bg-secondary text-foreground mr-4"
                }`}>
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-1.5 text-muted-foreground p-2">
                  <Loader2 size={12} className="animate-spin" />
                  <span className="text-xs">Analyzing your shipment...</span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={e => { e.preventDefault(); ask(input); }} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your shipment..."
              className="text-xs h-8"
              disabled={loading}
            />
            <Button type="submit" size="sm" disabled={loading || !input.trim()} className="h-8 w-8 p-0">
              <Send size={12} />
            </Button>
          </form>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
