import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Library, FileSearch, GitCompare, Download, Search, History } from "lucide-react";
import { DocumentLibraryTab } from "@/components/docIntel/DocumentLibraryTab";
import { MismatchDetectionTab } from "@/components/docIntel/MismatchDetectionTab";
import { DocIntelExportTab } from "@/components/docIntel/DocIntelExportTab";
import { HSCodeAssist } from "@/components/docIntel/HSCodeAssist";
import { RepeatShipmentMemory } from "@/components/docIntel/RepeatShipmentMemory";
import { TabContextBanner } from "@/components/TabContextBanner";
import { toast } from "sonner";

import DocumentValidator from "./DocumentValidator";

export default function DocumentIntelligence() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "library";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Shared lane context for HS Code Assist
  const [laneContext, setLaneContext] = useState({
    origin: "",
    destination: "",
    mode: "sea",
    hsCode: "",
    declaredValue: "",
  });

  const handleSelectHSCode = (code: string) => {
    setLaneContext(prev => ({ ...prev, hsCode: code }));
    toast.success(`HS Code ${code} selected — switch to Validator to use it`);
  };

  const handleApplyPrior = (session: any) => {
    setLaneContext({
      origin: session.origin_country || "",
      destination: session.destination_country || "",
      mode: session.shipment_mode || "sea",
      hsCode: session.hs_code || "",
      declaredValue: session.declared_value || "",
    });
    toast.success("Pre-filled from prior session — switch to Validator to continue");
    setActiveTab("validator");
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center">
          <FileSearch size={16} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Document Intelligence</h1>
          <p className="text-[10px] font-mono text-muted-foreground tracking-wider">
            INTAKE · EXTRACT · VALIDATE · CLASSIFY · EXPORT
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/30 border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="library" className="text-xs font-mono gap-1.5">
            <Library size={12} /> Library
          </TabsTrigger>
          <TabsTrigger value="validator" className="text-xs font-mono gap-1.5">
            <FileSearch size={12} /> Validator
          </TabsTrigger>
          <TabsTrigger value="mismatches" className="text-xs font-mono gap-1.5">
            <GitCompare size={12} /> Mismatches
          </TabsTrigger>
          <TabsTrigger value="hs-assist" className="text-xs font-mono gap-1.5">
            <Search size={12} /> HS Assist
          </TabsTrigger>
          <TabsTrigger value="memory" className="text-xs font-mono gap-1.5">
            <History size={12} /> Memory
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs font-mono gap-1.5">
            <Download size={12} /> Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-0">
          <TabContextBanner tabId="library" />
          <DocumentLibraryTab />
        </TabsContent>

        <TabsContent value="validator" className="mt-0">
          <TabContextBanner tabId="validator" />
          <DocumentValidator embedded />
        </TabsContent>

        <TabsContent value="mismatches" className="mt-0">
          <TabContextBanner tabId="mismatches" />
          <MismatchDetectionTab />
        </TabsContent>

        <TabsContent value="hs-assist" className="mt-0">
          <TabContextBanner tabId="hs-assist" />
          <HSCodeAssist
            destinationCountry={laneContext.destination}
            originCountry={laneContext.origin}
            transportMode={laneContext.mode}
            onSelectCode={handleSelectHSCode}
            onFlagForReview={(code, reason) => {
              toast.info(`Audit log: HS ${code} flagged — ${reason}`);
            }}
          />
        </TabsContent>

        <TabsContent value="memory" className="mt-0">
          <TabContextBanner tabId="memory" />
          <RepeatShipmentMemory
            originCountry={laneContext.origin}
            destinationCountry={laneContext.destination}
            shipmentMode={laneContext.mode}
            hsCode={laneContext.hsCode}
            declaredValue={laneContext.declaredValue}
            onApplyPrior={handleApplyPrior}
          />
          {!laneContext.origin && !laneContext.destination && (
            <div className="text-center py-12 text-muted-foreground font-mono text-sm">
              Set an origin and destination lane context to check for prior shipments.
              <br />
              <span className="text-[10px]">Use the Validator tab to set your lane, then return here.</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="export" className="mt-0">
          <DocIntelExportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
