import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Search, X, Loader2, CheckCheck, AlertTriangle, Info, ShieldAlert } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  event_type: string;
  severity: string;
  is_read: boolean;
  shipment_id: string | null;
  link: string | null;
  created_at: string;
};

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "critical": return <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />;
    case "warning": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
    default: return <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}

export function GlobalTopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ shipment_id: string; description: string; status: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
    };
    load();

    // Realtime subscription
    const channel = supabase
      .channel("notifications-rt")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20));
        setUnreadCount((prev) => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("shipments")
      .select("shipment_id, description, status")
      .or(`shipment_id.ilike.%${q}%,description.ilike.%${q}%,consignee.ilike.%${q}%,hs_code.ilike.%${q}%`)
      .limit(8);
    setSearchResults(data || []);
    setSearching(false);
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Search */}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Search shipments">
            <Search className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-2" align="end">
          <div className="flex items-center gap-1 mb-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search shipments, HS codes..."
              className="h-7 text-xs border-0 focus-visible:ring-0 shadow-none"
              autoFocus
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setSearchQuery(""); setSearchResults([]); }}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          {searching && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>}
          {!searching && searchResults.length > 0 && (
            <div className="space-y-0.5">
              {searchResults.map((r) => (
                <button
                  key={r.shipment_id}
                  onClick={() => { navigate(`/shipment/${r.shipment_id}`); setSearchOpen(false); setSearchQuery(""); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted/50 text-left"
                >
                  <span className="font-mono font-medium text-primary">{r.shipment_id}</span>
                  <span className="truncate text-muted-foreground flex-1">{r.description}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">{r.status}</Badge>
                </button>
              ))}
            </div>
          )}
          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-3 font-mono">No results</p>
          )}
        </PopoverContent>
      </Popover>

      {/* Notifications */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 relative" title="Notifications">
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-mono font-medium">NOTIFICATIONS</span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-[10px] h-5 px-1.5" onClick={markAllRead}>
                <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
              </Button>
            )}
          </div>
          <ScrollArea className="max-h-72">
            {notifications.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-8 font-mono">No notifications</p>
            ) : (
              <div className="p-1">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (n.link) navigate(n.link);
                      else if (n.shipment_id) navigate(`/shipment/${n.shipment_id}`);
                      if (!n.is_read) {
                        supabase.from("notifications").update({ is_read: true }).eq("id", n.id).then();
                        setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
                        setUnreadCount((prev) => Math.max(0, prev - 1));
                      }
                    }}
                    className={`w-full flex items-start gap-2 px-2 py-2 rounded text-left text-xs hover:bg-muted/50 ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <SeverityIcon severity={n.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{n.title}</div>
                      {n.body && <div className="text-muted-foreground text-[10px] truncate">{n.body}</div>}
                      <div className="text-[9px] text-muted-foreground/60 mt-0.5">
                        {new Date(n.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
