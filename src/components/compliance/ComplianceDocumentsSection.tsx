import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Info, X } from "lucide-react";
import type { RequiredDocument, TransportMode, Direction } from "@/lib/complianceEngineData";
import { ComplianceDocumentDrawer } from "./ComplianceDocumentDrawer";

const modeIcons: Record<string, string> = { air: "✈️", sea: "🚢", land: "🚛" };
const dirIcons: Record<string, string> = { inbound: "📥", outbound: "📤" };

export function ComplianceDocumentsSection({
  documents,
  mode,
  direction,
  countryName,
}: {
  documents: RequiredDocument[];
  mode: TransportMode | "all";
  direction: Direction | "all";
  countryName: string;
}) {
  const [selectedDoc, setSelectedDoc] = useState<RequiredDocument | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tagFilters, setTagFilters] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setTagFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const clearFilters = () => setTagFilters([]);

  const filteredDocs = documents.filter(doc => {
    if (tagFilters.length === 0) return true;
    const modeFilters = tagFilters.filter(t => ["air", "sea", "land"].includes(t));
    const dirFilters = tagFilters.filter(t => ["inbound", "outbound"].includes(t));
    const modeMatch = modeFilters.length === 0 || modeFilters.some(m => doc.modes.includes(m as TransportMode));
    const dirMatch = dirFilters.length === 0 || dirFilters.some(d => doc.directions.includes(d as Direction));
    return modeMatch && dirMatch;
  });

  const openDoc = (doc: RequiredDocument) => {
    setSelectedDoc(doc);
    setDrawerOpen(true);
  };

  if (documents.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-mono">
            No documents match the selected mode and direction filters
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Icon Legend */}
      <Card className="bg-muted/30">
        <CardContent className="py-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-muted-foreground mr-2">FILTER BY:</span>
            {(["air", "sea", "land"] as const).map(m => (
              <Badge
                key={m}
                variant={tagFilters.includes(m) ? "default" : "outline"}
                className="text-[9px] px-2 py-0.5 cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => toggleTag(m)}
              >
                {modeIcons[m]} {m}
              </Badge>
            ))}
            {(["inbound", "outbound"] as const).map(d => (
              <Badge
                key={d}
                variant={tagFilters.includes(d) ? "default" : "secondary"}
                className="text-[9px] px-2 py-0.5 cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => toggleTag(d)}
              >
                {dirIcons[d]} {d}
              </Badge>
            ))}
            {tagFilters.length > 0 && (
              <Badge variant="destructive" className="text-[9px] px-2 py-0.5 cursor-pointer" onClick={clearFilters}>
                <X className="h-3 w-3 mr-0.5" /> Clear
              </Badge>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5">
            ✈️ air freight · 🚢 sea freight · 🚛 land/road · 📥 importing · 📤 exporting — click tags to filter, click cards for details
          </p>
        </CardContent>
      </Card>

      <p className="text-[10px] font-mono text-muted-foreground">
        {filteredDocs.length} DOCUMENT{filteredDocs.length !== 1 ? "S" : ""}
        {mode !== "all" ? ` · ${mode.toUpperCase()}` : ""}
        {direction !== "all" ? ` · ${direction.toUpperCase()}` : ""}
        {tagFilters.length > 0 ? ` · ${tagFilters.length} tag filter${tagFilters.length > 1 ? "s" : ""}` : ""}
      </p>

      {filteredDocs.map((doc, i) => (
        <Card key={i} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openDoc(doc)}>
          <CardContent className="py-3 flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{doc.name}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {doc.modes.map(m => (
                  <Badge key={m} variant="outline" className="text-[9px] px-1.5 py-0">
                    {modeIcons[m]} {m}
                  </Badge>
                ))}
                {doc.directions.map(d => (
                  <Badge key={d} variant="secondary" className="text-[9px] px-1.5 py-0">
                    {dirIcons[d]} {d}
                  </Badge>
                ))}
              </div>
            </div>
            <span className="text-[9px] text-primary font-mono shrink-0">Details →</span>
          </CardContent>
        </Card>
      ))}

      <ComplianceDocumentDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        document={selectedDoc}
        countryName={countryName}
      />
    </div>
  );
}
