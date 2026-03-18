import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import {
  MessageSquare, Plus, Hash, Ship, Send, Pin, Loader2, Users
} from "lucide-react";

type Channel = {
  id: string;
  name: string;
  channel_type: string;
  shipment_id: string | null;
  created_at: string;
};

type Message = {
  id: string;
  channel_id: string;
  user_id: string | null;
  user_name: string | null;
  content: string;
  is_pinned: boolean;
  mentions: string[];
  created_at: string;
};

export default function TeamChat() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load channels
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("chat_channels")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: true });
      if (data) {
        setChannels(data);
        if (data.length > 0 && !activeChannel) setActiveChannel(data[0].id);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Load messages for active channel + subscribe to realtime
  useEffect(() => {
    if (!activeChannel) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("channel_id", activeChannel)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMessages(data as Message[]);
    };
    loadMessages();

    const channel = supabase
      .channel(`chat-${activeChannel}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannel}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChannel]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeChannel || !user) return;
    setSending(true);
    // Extract @mentions
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(newMessage)) !== null) mentions.push(match[1]);

    const { error } = await supabase.from("chat_messages").insert({
      channel_id: activeChannel,
      user_id: user.id,
      user_name: user.email?.split("@")[0] || "User",
      content: newMessage.trim(),
      mentions,
    });
    if (error) toast.error("Failed to send message");
    else setNewMessage("");
    setSending(false);
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    const { data, error } = await supabase.from("chat_channels").insert({
      name: newChannelName.trim(),
      channel_type: "general",
      created_by: user?.id,
    }).select().single();
    if (error) toast.error("Failed to create channel");
    else if (data) {
      setChannels((prev) => [...prev, data]);
      setActiveChannel(data.id);
      setNewChannelName("");
      setShowNewChannel(false);
    }
  };

  const activeChannelData = channels.find((c) => c.id === activeChannel);
  const channelIcon = (type: string) =>
    type === "shipment" ? <Ship className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t("chat.title")}</h1>
          <p className="text-xs text-muted-foreground font-mono">{t("chat.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-220px)]">
        {/* Channel list */}
        <Card className="md:col-span-1 flex flex-col">
          <CardHeader className="pb-2 flex-none">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-mono">{t("chat.channels")}</CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNewChannel(!showNewChannel)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {showNewChannel && (
              <div className="flex gap-1 mt-2">
                <Input
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Channel name"
                  className="text-xs h-7"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateChannel()}
                />
                <Button size="sm" className="h-7 text-xs" onClick={handleCreateChannel}>Add</Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-2">
            <div className="space-y-0.5">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono transition-colors text-left ${
                    activeChannel === ch.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {channelIcon(ch.channel_type)}
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}
              {channels.length === 0 && (
                <p className="text-[10px] text-muted-foreground/60 text-center py-4">No channels yet. Create one!</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="md:col-span-3 flex flex-col">
          <CardHeader className="pb-2 flex-none border-b border-border">
            <div className="flex items-center gap-2">
              {activeChannelData && channelIcon(activeChannelData.channel_type)}
              <CardTitle className="text-sm font-mono">
                {activeChannelData?.name || "Select a channel"}
              </CardTitle>
              {activeChannelData?.channel_type === "shipment" && activeChannelData.shipment_id && (
                <Badge variant="outline" className="text-[10px]">{activeChannelData.shipment_id}</Badge>
              )}
              <div className="ml-auto flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-mono">Team</span>
              </div>
            </div>
          </CardHeader>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.length === 0 && activeChannel && (
                <div className="text-center py-12">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-mono">No messages yet. Start the conversation!</p>
                </div>
              )}
              {!activeChannel && (
                <div className="text-center py-12">
                  <Hash className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-mono">Select or create a channel</p>
                </div>
              )}
              {messages.map((msg) => {
                const isOwn = msg.user_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] space-y-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-medium text-muted-foreground">
                          {msg.user_name || "Unknown"}
                        </span>
                        <span className="text-[9px] text-muted-foreground/50">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {msg.is_pinned && <Pin className="h-2.5 w-2.5 text-primary" />}
                      </div>
                      <div className={`rounded-lg px-3 py-1.5 text-xs ${
                        isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        {msg.content.split(/(@\w+)/g).map((part, i) =>
                          part.startsWith("@") ? (
                            <span key={i} className="font-bold text-accent-foreground">{part}</span>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          {activeChannel && (
            <div className="p-3 border-t border-border flex gap-2 flex-none">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Type a message... Use @name to mention"
                className="text-sm"
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
