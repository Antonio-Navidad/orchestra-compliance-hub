import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X, Save } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface CommandFilters {
  search: string;
  origin: string;
  destination: string;
  mode: string;
  status: string;
  readinessMin: string;
  readinessMax: string;
}

const EMPTY_FILTERS: CommandFilters = { search: "", origin: "", destination: "", mode: "", status: "", readinessMin: "", readinessMax: "" };

interface Props {
  filters: CommandFilters;
  onChange: (f: CommandFilters) => void;
}

export function CommandSearchBar({ filters, onChange }: Props) {
  const [savedPresets, setSavedPresets] = useState<{ name: string; filters: CommandFilters }[]>([]);
  const activeFilterCount = Object.values(filters).filter(v => v && v !== "").length - (filters.search ? 1 : 0);

  const savePreset = () => {
    const name = prompt("Name this filter preset:");
    if (name) setSavedPresets(prev => [...prev, { name, filters: { ...filters } }]);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          placeholder="Search shipments by ID, company, HS code, port..."
          className="pl-9 font-mono text-xs h-9"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="font-mono text-xs gap-1.5 h-9">
            <Filter size={12} /> Filters
            {activeFilterCount > 0 && (
              <Badge className="text-[9px] px-1 py-0 ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] space-y-3" align="end">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold tracking-wider">FILTER SHIPMENTS</span>
            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => onChange(EMPTY_FILTERS)}>
              <X size={10} className="mr-1" /> Clear all
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground">Origin</span>
              <Input value={filters.origin} onChange={e => onChange({ ...filters, origin: e.target.value })} placeholder="e.g. CN" className="h-7 text-xs" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground">Destination</span>
              <Input value={filters.destination} onChange={e => onChange({ ...filters, destination: e.target.value })} placeholder="e.g. US" className="h-7 text-xs" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono text-muted-foreground">Mode</span>
            <Select value={filters.mode} onValueChange={v => onChange({ ...filters, mode: v })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All modes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="air">Air</SelectItem>
                <SelectItem value="sea">Sea</SelectItem>
                <SelectItem value="land">Land</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono text-muted-foreground">Status</span>
            <Select value={filters.status} onValueChange={v => onChange({ ...filters, status: v })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">Draft</SelectItem>
                <SelectItem value="waiting_docs">Documents Pending</SelectItem>
                <SelectItem value="in_review">Under Review</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="customs_hold">Customs Hold</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1 flex-1" onClick={savePreset}>
              <Save size={10} /> Save preset
            </Button>
          </div>

          {savedPresets.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground">SAVED PRESETS</span>
              <div className="flex flex-wrap gap-1">
                {savedPresets.map((p, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] cursor-pointer hover:bg-primary/10" onClick={() => onChange(p.filters)}>
                    {p.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { EMPTY_FILTERS };
