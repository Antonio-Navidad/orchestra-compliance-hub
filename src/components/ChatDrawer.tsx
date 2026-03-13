import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2 } from "lucide-react";

type Message = {
  id: string;
  user_name: string | null;
  user_id: string | null;
  content: string;
  created_at: string;
};

export function ChatDrawer() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get or create a "general" channel for quick chat
  useEffect(() => {
    if (!open) return;
    const init = async () => {
      const { data } = await supabase
        .from("chat_channels")
        .select("id")
        .eq("name", "general")
        .eq("channel_type", "general")
        .limit(1)
        .single();

      if (data) {
        setChannelId(data.id);
      } else {
        const { data: created } = await supabase
          .from("chat_channels")
          .insert({ name: "general", channel_type: "general", created_by: user?.id })
          .select("id")
          .single();
        if (created) setChannelId(created.id);
      }
    };
    init();
  }, [open, user]);

  // Load + subscribe
  useEffect(() => {
    if (!channelId) return;
    const load = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, user_name, user_id, content, created_at")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    };
    load();

    const channel = supabase
      .channel(`drawer-${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !channelId || !user) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      channel_id: channelId,
      user_id: user.id,
      user_name: user.email?.split("@")[0] || "User",
      content: input.trim(),
    });
    if (error) toast.error("Send failed");
    else setInput("");
    setSending(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative" title="Team Chat">
          <MessageSquare className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[360px] sm:w-[400px] flex flex-col p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-sm font-mono flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Quick Chat
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {messages.map((msg) => {
              const isOwn = msg.user_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[80%]">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{msg.user_name}</span>
                      <span className="text-[9px] text-muted-foreground/50">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className={`rounded-lg px-2.5 py-1 text-xs ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message..."
            className="text-sm"
            disabled={sending}
          />
          <Button size="icon" onClick={send} disabled={sending || !input.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
