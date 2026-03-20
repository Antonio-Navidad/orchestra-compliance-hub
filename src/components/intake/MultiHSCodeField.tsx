import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertTriangle, Sparkles } from "lucide-react";

// Simplified HS code duty lookup
const HS_DESCRIPTIONS: Record<string, { desc: string; rate: string; rateNum: number }> = {
  "6109.10.00": { desc: "T-shirts, singlets, tank tops — cotton, knitted", rate: "16.5%", rateNum: 16.5 },
  "6203.42.40": { desc: "Men's/boys' trousers — cotton (denim)", rate: "16.6%", rateNum: 16.6 },
  "6105.20.20": { desc: "Men's/boys' shirts — man-made fibers, knitted", rate: "32%", rateNum: 32 },
  "6206.10.00": { desc: "Women's/girls' blouses — silk or silk waste", rate: "2.1%", rateNum: 2.1 },
  "8471.30": { desc: "Portable automatic data processing machines", rate: "0%", rateNum: 0 },
};

function getHSInfo(code: string) {
  const normalized = code.replace(/\s/g, "");
  if (HS_DESCRIPTIONS[normalized]) return HS_DESCRIPTIONS[normalized];
  const prefix = Object.keys(HS_DESCRIPTIONS).find(k => normalized.startsWith(k.replace(/\.00$/, "")));
  if (prefix) return HS_DESCRIPTIONS[prefix];
  return null;
}

interface HSEntry {
  code: string;
  description?: string;
  dutyRate?: string;
  dutyAmount?: number;
}

interface MultiHSCodeFieldProps {
  hsCodes: string[];
  onCodesChange: (codes: string[]) => void;
  declaredValue: string;
  currency: string;
  aiSuggestions?: string[];
}

export function MultiHSCodeField({ hsCodes, onCodesChange, declaredValue, currency, aiSuggestions = [] }: MultiHSCodeFieldProps) {
  const [newCode, setNewCode] = useState("");
  const val = parseFloat(declaredValue) || 0;

  const entries: HSEntry[] = hsCodes.map(code => {
    const info = getHSInfo(code);
    const perCodeValue = hsCodes.length > 0 ? val / hsCodes.length : 0;
    return {
      code,
      description: info?.desc,
      dutyRate: info?.rate,
      dutyAmount: info ? perCodeValue * info.rateNum / 100 : undefined,
    };
  });

  const totalDuty = entries.reduce((sum, e) => sum + (e.dutyAmount || 0), 0);
  const hasMultiple = hsCodes.length > 1;

  const addCode = (code: string) => {
    const trimmed = code.trim();
    if (trimmed && !hsCodes.includes(trimmed)) {
      onCodesChange([...hsCodes, trimmed]);
    }
    setNewCode("");
  };

  const removeCode = (idx: number) => {
    onCodesChange(hsCodes.filter((_, i) => i !== idx));
  };

  const unusedSuggestions = aiSuggestions.filter(s => !hsCodes.includes(s));

  return (
    <div className="space-y-2">
      {/* Existing codes */}
      {entries.map((entry, idx) => (
        <div key={idx} className="flex items-start gap-2 p-2 rounded-md border border-border bg-secondary/20">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold">{entry.code}</span>
              {entry.dutyRate && (
                <Badge variant="outline" className="text-[9px]">{entry.dutyRate}</Badge>
              )}
            </div>
            {entry.description && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{entry.description}</p>
            )}
            {entry.dutyAmount !== undefined && val > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Est. duty: {currency} {entry.dutyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => removeCode(idx)} className="h-6 w-6 p-0 shrink-0">
            <X size={12} />
          </Button>
        </div>
      ))}

      {/* Add new code */}
      <div className="flex gap-2">
        <Input
          value={newCode}
          onChange={e => setNewCode(e.target.value)}
          placeholder="Enter HS code..."
          className="font-mono text-xs"
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCode(newCode); } }}
        />
        <Button variant="outline" size="sm" onClick={() => addCode(newCode)} disabled={!newCode.trim()} className="text-xs font-mono gap-1 shrink-0">
          <Plus size={12} /> Add
        </Button>
      </div>

      {/* Mixed goods warning */}
      {hasMultiple && (
        <div className="flex items-start gap-1.5 p-2 rounded-md border border-risk-high/30 bg-risk-high/5">
          <AlertTriangle size={11} className="text-risk-high shrink-0 mt-0.5" />
          <span className="text-[10px] text-risk-high">
            This shipment contains mixed items requiring separate HS classifications. Each line will be assessed for duty individually.
          </span>
        </div>
      )}

      {/* Total duty for mixed goods */}
      {hasMultiple && totalDuty > 0 && (
        <div className="flex justify-between items-center p-2 rounded-md bg-muted/30 border border-border">
          <span className="text-[10px] font-mono text-muted-foreground">Combined estimated duty</span>
          <span className="text-xs font-mono font-bold">{currency} {totalDuty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      )}

      {/* AI suggestions */}
      {unusedSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={10} className="text-primary" />
            <span className="text-[10px] font-mono text-muted-foreground">AI-suggested HS codes:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unusedSuggestions.map(code => {
              const info = getHSInfo(code);
              return (
                <button
                  key={code}
                  onClick={() => addCode(code)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-xs font-mono cursor-pointer"
                >
                  <Plus size={10} className="text-primary" />
                  <span className="font-bold">{code}</span>
                  {info && <span className="text-[9px] text-muted-foreground max-w-[150px] truncate">{info.desc}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
