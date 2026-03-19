import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Lock, Award, Search } from "lucide-react";
import type { CountryComplianceProfile } from "@/lib/complianceEngineData";
import { ComplianceRestrictedDrawer } from "./ComplianceRestrictedDrawer";

export function ComplianceRestrictedSection({ profile }: { profile: CountryComplianceProfile }) {
  const { restrictedGoods } = profile;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"licensed" | "prohibited" | "certification">("licensed");
  const [productQuery, setProductQuery] = useState("");

  const openCategory = (category: string, type: "licensed" | "prohibited" | "certification") => {
    setSelectedCategory(category);
    setSelectedType(type);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Product checker */}
      <Card className="border-primary/20">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Check My Product</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">
            Type a product description to check if it falls into any restricted or prohibited category for {profile.name}
          </p>
          <Input
            placeholder="e.g., lithium batteries, cosmetics, firearms..."
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            className="text-xs h-8"
          />
          {productQuery.length > 2 && (
            <div className="mt-2 p-2 bg-muted/30 rounded-md">
              <p className="text-[10px] text-muted-foreground font-mono">
                Checking "{productQuery}" against {profile.name}'s restricted categories...
              </p>
              {restrictedGoods.licensedCategories
                .filter(c => c.toLowerCase().includes(productQuery.toLowerCase()))
                .map((c, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] mr-1 mt-1 cursor-pointer" onClick={() => openCategory(c, "licensed")}>
                    ⚠️ {c} — License required
                  </Badge>
                ))}
              {restrictedGoods.prohibitedCategories
                .filter(c => c.toLowerCase().includes(productQuery.toLowerCase()))
                .map((c, i) => (
                  <Badge key={i} variant="destructive" className="text-[9px] mr-1 mt-1 cursor-pointer" onClick={() => openCategory(c, "prohibited")}>
                    🚫 {c} — Prohibited
                  </Badge>
                ))}
              {restrictedGoods.specialCertifications
                .filter(c => c.toLowerCase().includes(productQuery.toLowerCase()))
                .map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-[9px] mr-1 mt-1 cursor-pointer" onClick={() => openCategory(c, "certification")}>
                    📋 {c} — Certification needed
                  </Badge>
                ))}
              {![...restrictedGoods.licensedCategories, ...restrictedGoods.prohibitedCategories, ...restrictedGoods.specialCertifications]
                .some(c => c.toLowerCase().includes(productQuery.toLowerCase())) && (
                <p className="text-[10px] text-green-600 mt-1">✅ No matches found in restricted/prohibited categories</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] font-mono text-muted-foreground">LICENSED / PERMIT-REQUIRED CATEGORIES</span>
            <span className="text-[9px] text-primary font-mono ml-auto">Click for details</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {restrictedGoods.licensedCategories.map((c, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => openCategory(c, "licensed")}
              >
                {c}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-destructive" />
            <span className="text-[10px] font-mono text-muted-foreground">PROHIBITED GOODS</span>
            <span className="text-[9px] text-primary font-mono ml-auto">Click for details</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {restrictedGoods.prohibitedCategories.map((c, i) => (
              <Badge
                key={i}
                variant="destructive"
                className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => openCategory(c, "prohibited")}
              >
                {c}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-mono text-muted-foreground">SPECIAL CERTIFICATIONS REQUIRED</span>
            <span className="text-[9px] text-primary font-mono ml-auto">Click for details</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {restrictedGoods.specialCertifications.map((c, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => openCategory(c, "certification")}
              >
                {c}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <ComplianceRestrictedDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        category={selectedCategory}
        type={selectedType}
        countryName={profile.name}
      />
    </div>
  );
}
