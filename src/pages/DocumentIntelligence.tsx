import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Library, FileSearch, GitCompare, History, Download } from "lucide-react";
import { DocumentLibraryTab } from "@/components/docIntel/DocumentLibraryTab";
import { MismatchDetectionTab } from "@/components/docIntel/MismatchDetectionTab";
import { DocIntelExportTab } from "@/components/docIntel/DocIntelExportTab";

// Lazy-load the existing validator
import DocumentValidator from "./DocumentValidator";

export default function DocumentIntelligence() {
  const [activeTab, setActiveTab] = useState("library");

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center">
          <FileSearch size={16} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Document Intelligence</h1>
          <p className="text-[10px] font-mono text-muted-foreground tracking-wider">
            INTAKE · EXTRACT · VALIDATE · EXPORT
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/30 border border-border">
          <TabsTrigger value="library" className="text-xs font-mono gap-1.5">
            <Library size={12} /> Library
          </TabsTrigger>
          <TabsTrigger value="validator" className="text-xs font-mono gap-1.5">
            <FileSearch size={12} /> Validator
          </TabsTrigger>
          <TabsTrigger value="mismatches" className="text-xs font-mono gap-1.5">
            <GitCompare size={12} /> Mismatches
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs font-mono gap-1.5">
            <Download size={12} /> Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-0">
          <DocumentLibraryTab />
        </TabsContent>

        <TabsContent value="validator" className="mt-0">
          <DocumentValidator embedded />
        </TabsContent>

        <TabsContent value="mismatches" className="mt-0">
          <MismatchDetectionTab />
        </TabsContent>

        <TabsContent value="export" className="mt-0">
          <DocIntelExportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
