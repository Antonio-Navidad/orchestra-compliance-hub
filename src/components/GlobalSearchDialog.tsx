import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { HELP_KNOWLEDGE_BASE, type HelpEntry } from "@/lib/helpContent";
import { BookOpen, FileText, Package, Search } from "lucide-react";

export function GlobalSearchDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [helpResults, setHelpResults] = useState<HelpEntry[]>([]);
  const [shipmentResults, setShipmentResults] = useState<any[]>([]);
  const [docResults, setDocResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const searchHelp = useCallback((q: string): HelpEntry[] => {
    if (!q || q.length < 2) return [];
    const lower = q.toLowerCase();
    return HELP_KNOWLEDGE_BASE.filter(
      (entry) =>
        entry.title.toLowerCase().includes(lower) ||
        entry.description.toLowerCase().includes(lower) ||
        entry.keywords.some((k) => k.includes(lower))
    ).slice(0, 5);
  }, []);

  const searchShipments = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setShipmentResults([]); setDocResults([]); return; }
    setSearching(true);
    const [shipRes, docRes] = await Promise.all([
      supabase
        .from("shipments")
        .select("shipment_id, description, status, origin, destination, created_at")
        .or(`shipment_id.ilike.%${q}%,description.ilike.%${q}%,consignee.ilike.%${q}%,hs_code.ilike.%${q}%,origin.ilike.%${q}%,destination.ilike.%${q}%`)
        .limit(6),
      supabase
        .from("document_library")
        .select("id, file_name, document_type, origin_country, destination_country, created_at, shipment_id")
        .or(`file_name.ilike.%${q}%,document_type.ilike.%${q}%,origin_country.ilike.%${q}%,destination_country.ilike.%${q}%`)
        .limit(5),
    ]);
    setShipmentResults(shipRes.data || []);
    setDocResults(docRes.data || []);
    setSearching(false);
  }, []);

  useEffect(() => {
    setHelpResults(searchHelp(query));
    const timer = setTimeout(() => searchShipments(query), 200);
    return () => clearTimeout(timer);
  }, [query, searchHelp, searchShipments]);

  const handleSelect = (route: string, tab?: string) => {
    setOpen(false);
    setQuery("");
    if (tab) {
      navigate(`${route}?tab=${tab}`);
    } else {
      navigate(route);
    }
  };

  const hasResults = helpResults.length > 0 || shipmentResults.length > 0 || docResults.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search help, shipments, documents… (⌘K)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!searching && query.length >= 2 && !hasResults && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {helpResults.length > 0 && (
          <CommandGroup heading="Help & Features">
            {helpResults.map((entry) => (
              <CommandItem
                key={entry.route + (entry.tab || "")}
                onSelect={() => handleSelect(entry.route, entry.tab)}
                className="gap-2"
              >
                <BookOpen className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{entry.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{entry.description}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {helpResults.length > 0 && (shipmentResults.length > 0 || docResults.length > 0) && (
          <CommandSeparator />
        )}

        {shipmentResults.length > 0 && (
          <CommandGroup heading="Shipments">
            {shipmentResults.map((s) => (
              <CommandItem
                key={s.shipment_id}
                onSelect={() => handleSelect(`/shipment/${s.shipment_id}`)}
                className="gap-2"
              >
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-primary">{s.shipment_id}</span>
                    <Badge variant="outline" className="text-[9px]">{s.status}</Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {s.origin && s.destination ? `${s.origin} → ${s.destination}` : s.description}
                    {s.created_at && (
                      <span className="ml-2 text-muted-foreground/60">
                        {new Date(s.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {docResults.length > 0 && (
          <CommandGroup heading="Documents">
            {docResults.map((d) => (
              <CommandItem
                key={d.id}
                onSelect={() => handleSelect("/doc-intel", "library")}
                className="gap-2"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{d.file_name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {d.document_type?.replace(/_/g, " ")}
                    {d.origin_country && d.destination_country && ` · ${d.origin_country} → ${d.destination_country}`}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
