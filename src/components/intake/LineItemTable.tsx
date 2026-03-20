import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";

const HS_LOOKUP: Record<string, { desc: string; rate: string; rateNum: number }> = {
  "6109.10.00": { desc: "T-shirts, singlets, tank tops — cotton, knitted", rate: "16.5%", rateNum: 16.5 },
  "6203.42.40": { desc: "Men's/boys' trousers — cotton (denim)", rate: "16.6%", rateNum: 16.6 },
  "6105.20.20": { desc: "Men's/boys' shirts — man-made fibers, knitted", rate: "32%", rateNum: 32 },
  "6206.10.00": { desc: "Women's/girls' blouses — silk or silk waste", rate: "2.1%", rateNum: 2.1 },
  "8471.30": { desc: "Portable automatic data processing machines", rate: "0%", rateNum: 0 },
};

function lookupHS(code: string) {
  const c = code.replace(/\s/g, "");
  if (HS_LOOKUP[c]) return HS_LOOKUP[c];
  const prefix = Object.keys(HS_LOOKUP).find(k => c.startsWith(k.replace(/\.00$/, "")));
  return prefix ? HS_LOOKUP[prefix] : null;
}

const UOM_OPTIONS = ["pcs", "cartons", "kg", "lbs", "cbm", "sets", "pairs", "rolls", "pallets", "bags", "boxes"];

export interface LineItem {
  id: string;
  hsCode: string;
  description: string;
  quantity: string;
  uom: string;
  unitValue: string;
}

interface LineItemTableProps {
  items: LineItem[];
  onItemsChange: (items: LineItem[]) => void;
  currency: string;
  aiSuggestions?: Array<{ hsCode: string; description?: string }>;
}

function makeId() {
  return crypto.randomUUID();
}

export function LineItemTable({ items, onItemsChange, currency, aiSuggestions = [] }: LineItemTableProps) {
  const addRow = (hsCode = "", description = "") => {
    onItemsChange([...items, { id: makeId(), hsCode, description, quantity: "", uom: "pcs", unitValue: "" }]);
  };

  const updateRow = (id: string, field: keyof LineItem, value: string) => {
    onItemsChange(items.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRow = (id: string) => {
    onItemsChange(items.filter(r => r.id !== id));
  };

  const lineTotal = (row: LineItem) => {
    const q = parseFloat(row.quantity) || 0;
    const u = parseFloat(row.unitValue) || 0;
    return q * u;
  };

  const grandTotal = items.reduce((sum, r) => sum + lineTotal(r), 0);

  const unusedSuggestions = aiSuggestions.filter(s => !items.some(r => r.hsCode === s.hsCode));

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-[10px] font-mono h-8 px-2">HS CODE</TableHead>
              <TableHead className="text-[10px] font-mono h-8 px-2">DESCRIPTION</TableHead>
              <TableHead className="text-[10px] font-mono h-8 px-2 w-20">QTY</TableHead>
              <TableHead className="text-[10px] font-mono h-8 px-2 w-24">UOM</TableHead>
              <TableHead className="text-[10px] font-mono h-8 px-2 w-24">UNIT VALUE</TableHead>
              <TableHead className="text-[10px] font-mono h-8 px-2 w-28 text-right">LINE TOTAL</TableHead>
              <TableHead className="h-8 px-2 w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                  No line items yet. Click "+ Add Item" to begin.
                </TableCell>
              </TableRow>
            )}
            {items.map(row => {
              const info = lookupHS(row.hsCode);
              const lt = lineTotal(row);
              const duty = info ? lt * info.rateNum / 100 : 0;
              return (
                <TableRow key={row.id}>
                  <TableCell className="px-2 py-1.5 align-top">
                    <Input
                      value={row.hsCode}
                      onChange={e => updateRow(row.id, "hsCode", e.target.value)}
                      placeholder="6109.10.00"
                      className="font-mono text-xs h-7"
                    />
                    {info && (
                      <Badge variant="outline" className="text-[8px] mt-0.5">{info.rate} duty</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 align-top">
                    <Input
                      value={row.description}
                      onChange={e => updateRow(row.id, "description", e.target.value)}
                      placeholder={info?.desc || "Item description"}
                      className="text-xs h-7"
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1.5 align-top">
                    <Input
                      type="number"
                      value={row.quantity}
                      onChange={e => updateRow(row.id, "quantity", e.target.value)}
                      placeholder="0"
                      className="font-mono text-xs h-7"
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1.5 align-top">
                    <Select value={row.uom} onValueChange={v => updateRow(row.id, "uom", v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UOM_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 align-top">
                    <Input
                      type="number"
                      value={row.unitValue}
                      onChange={e => updateRow(row.id, "unitValue", e.target.value)}
                      placeholder="0.00"
                      className="font-mono text-xs h-7"
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right align-top">
                    <span className="text-xs font-mono font-bold">
                      {currency} {lt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {duty > 0 && (
                      <p className="text-[9px] text-muted-foreground">
                        Est. duty: {currency} {duty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5 align-top">
                    <Button variant="ghost" size="sm" onClick={() => removeRow(row.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 size={12} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          {items.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="px-2 text-xs font-mono text-right">
                  TOTAL DECLARED VALUE
                </TableCell>
                <TableCell className="px-2 text-right">
                  <span className="text-sm font-mono font-bold">
                    {currency} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <Button variant="outline" size="sm" onClick={() => addRow()} className="font-mono text-xs gap-1.5">
        <Plus size={12} /> Add Item
      </Button>

      {/* AI suggestions */}
      {unusedSuggestions.length > 0 && (
        <div className="space-y-1.5 p-2 rounded-md border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={10} className="text-primary" />
            <span className="text-[10px] font-mono text-muted-foreground">AI-detected commodities:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unusedSuggestions.map(s => {
              const info = lookupHS(s.hsCode);
              return (
                <button
                  key={s.hsCode}
                  onClick={() => addRow(s.hsCode, s.description || info?.desc || "")}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-xs font-mono cursor-pointer"
                >
                  <Plus size={10} className="text-primary" />
                  <span className="font-bold">{s.hsCode}</span>
                  {(s.description || info?.desc) && (
                    <span className="text-[9px] text-muted-foreground max-w-[180px] truncate">{s.description || info?.desc}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
