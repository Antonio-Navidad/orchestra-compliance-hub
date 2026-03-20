import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ShieldAlert, CalendarIcon, MapPin, Clock, DollarSign,
  FileText, Mail, Plus, Check, AlertTriangle,
} from "lucide-react";
import { HOLD_TYPES, HOLD_STATUS_OPTIONS, type ShipmentHold } from "@/lib/holdTypes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hold: ShipmentHold | null;
  onSave: (hold: Partial<ShipmentHold>) => void;
  onClickHoldType?: (holdType: string) => void;
}

export function HoldManagementPanel({ open, onOpenChange, hold, onSave, onClickHoldType }: Props) {
  const [holdType, setHoldType] = useState(hold?.hold_type || '');
  const [receivedDate, setReceivedDate] = useState<Date | undefined>(
    hold?.hold_received_date ? new Date(hold.hold_received_date) : undefined
  );
  const [portLocation, setPortLocation] = useState(hold?.port_ces_location || '');
  const [freeTimeExpires, setFreeTimeExpires] = useState<Date | undefined>(
    hold?.free_time_expires ? new Date(hold.free_time_expires) : undefined
  );
  const [demurrageTotal, setDemurrageTotal] = useState(hold?.demurrage_total?.toString() || '0');
  const [holdStatus, setHoldStatus] = useState(hold?.hold_status || 'active');
  const [resolutionDate, setResolutionDate] = useState<Date | undefined>(
    hold?.resolution_date ? new Date(hold.resolution_date) : undefined
  );
  const [notes, setNotes] = useState(hold?.notes || '');
  const [newDocName, setNewDocName] = useState('');
  const [submittedDocs, setSubmittedDocs] = useState<Array<{ name: string; date: string }>>(
    hold?.documents_submitted || []
  );

  const freeTimeDays = freeTimeExpires
    ? Math.ceil((freeTimeExpires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handleSave = () => {
    onSave({
      hold_type: holdType,
      hold_received_date: receivedDate?.toISOString() || null,
      port_ces_location: portLocation || null,
      free_time_expires: freeTimeExpires?.toISOString() || null,
      demurrage_total: parseFloat(demurrageTotal) || 0,
      documents_submitted: submittedDocs,
      hold_status: holdStatus,
      resolution_date: resolutionDate?.toISOString() || null,
      notes: notes || null,
    });
    onOpenChange(false);
  };

  const addDoc = () => {
    if (!newDocName.trim()) return;
    setSubmittedDocs(prev => [...prev, { name: newDocName.trim(), date: new Date().toISOString() }]);
    setNewDocName('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0" side="right">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border bg-destructive/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/15 flex items-center justify-center">
              <ShieldAlert size={20} className="text-destructive" />
            </div>
            <div>
              <SheetTitle className="text-[15px] font-bold">Hold Management</SheetTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Track and resolve CBP holds on this shipment
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5">
          {/* Hold Type */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hold Type</Label>
            <Select value={holdType} onValueChange={setHoldType}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select hold type" />
              </SelectTrigger>
              <SelectContent>
                {HOLD_TYPES.map(ht => (
                  <SelectItem key={ht.value} value={ht.value}>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        ht.severity === 'critical' ? 'bg-destructive' : ht.severity === 'high' ? 'bg-amber-500' : 'bg-yellow-500'
                      )} />
                      {ht.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {holdType && (
              <button
                onClick={() => onClickHoldType?.(holdType)}
                className="text-[10px] text-primary hover:underline cursor-pointer"
              >
                What does this hold mean? →
              </button>
            )}
          </div>

          <Separator />

          {/* Date & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <CalendarIcon size={10} /> Date Received
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full h-9 text-xs justify-start", !receivedDate && "text-muted-foreground")}>
                    <CalendarIcon size={12} className="mr-1.5" />
                    {receivedDate ? format(receivedDate, "MM/dd/yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={receivedDate} onSelect={setReceivedDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin size={10} /> Port / CES
              </Label>
              <Input value={portLocation} onChange={e => setPortLocation(e.target.value)} placeholder="e.g. LA/LB CES" className="h-9 text-xs" />
            </div>
          </div>

          <Separator />

          {/* Free Time & Demurrage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock size={10} /> Free Time Expires
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full h-9 text-xs justify-start", !freeTimeExpires && "text-muted-foreground")}>
                    <Clock size={12} className="mr-1.5" />
                    {freeTimeExpires ? format(freeTimeExpires, "MM/dd/yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={freeTimeExpires} onSelect={setFreeTimeExpires} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {freeTimeDays !== null && (
                <Badge variant="outline" className={cn(
                  "text-[9px] px-1.5 py-0",
                  freeTimeDays <= 0 ? "bg-destructive/10 text-destructive border-destructive/20" :
                  freeTimeDays <= 2 ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                )}>
                  {freeTimeDays <= 0 ? `⚠ Expired ${Math.abs(freeTimeDays)}d ago` : `${freeTimeDays} days remaining`}
                </Badge>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <DollarSign size={10} /> Demurrage Total
              </Label>
              <Input
                type="number"
                value={demurrageTotal}
                onChange={e => setDemurrageTotal(e.target.value)}
                placeholder="0.00"
                className="h-9 text-xs"
              />
              {parseFloat(demurrageTotal) > 0 && (
                <p className="text-[10px] text-destructive font-semibold">
                  ${parseFloat(demurrageTotal).toLocaleString()} accrued
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Documents Submitted */}
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <FileText size={10} /> Documents Submitted to Resolve
            </Label>
            {submittedDocs.length > 0 && (
              <div className="space-y-1">
                {submittedDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] py-1 px-2 rounded bg-secondary/30">
                    <Check size={10} className="text-emerald-500 shrink-0" />
                    <span className="flex-1">{doc.name}</span>
                    <span className="text-muted-foreground/60 text-[9px]">
                      {new Date(doc.date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <Input
                value={newDocName}
                onChange={e => setNewDocName(e.target.value)}
                placeholder="Document name"
                className="h-8 text-xs flex-1"
                onKeyDown={e => e.key === 'Enter' && addDoc()}
              />
              <Button size="sm" variant="outline" onClick={addDoc} className="h-8 px-2 text-[10px]">
                <Plus size={10} className="mr-1" /> Add
              </Button>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hold Status</Label>
              <Select value={holdStatus} onValueChange={setHoldStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOLD_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {holdStatus === 'resolved' && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resolution Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full h-9 text-xs justify-start", !resolutionDate && "text-muted-foreground")}>
                      {resolutionDate ? format(resolutionDate, "MM/dd/yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={resolutionDate} onSelect={setResolutionDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detailed notes on hold resolution progress..."
              className="text-xs min-h-[80px]"
            />
          </div>

          {/* Draft email */}
          <Button variant="outline" size="sm" className="text-[11px] gap-1.5 w-full">
            <Mail size={12} /> Draft Response to CBP
          </Button>

          <Separator />

          {/* Save */}
          <Button onClick={handleSave} className="w-full text-xs gap-1.5">
            <Check size={12} /> Save Hold Information
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Banner component for active holds
export function HoldBanner({ hold, onClick }: { hold: ShipmentHold | null; onClick: () => void }) {
  if (!hold || hold.hold_status === 'resolved') return null;

  const holdLabel = HOLD_TYPES.find(h => h.value === hold.hold_type)?.label || hold.hold_type;
  const isEscalated = hold.hold_status === 'escalated_to_exam';

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors",
        "border-b active:scale-[0.998] cursor-pointer",
        isEscalated
          ? "bg-destructive/15 border-destructive/30 hover:bg-destructive/20"
          : "bg-destructive/10 border-destructive/20 hover:bg-destructive/15"
      )}
    >
      <ShieldAlert size={16} className="text-destructive shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-bold text-destructive">
          {isEscalated ? 'Hold Escalated to Exam' : 'Hold Active'}
        </span>
        <span className="text-[11px] text-destructive/80 ml-2">{holdLabel}</span>
      </div>
      {hold.demurrage_total > 0 && (
        <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
          ${hold.demurrage_total.toLocaleString()} demurrage
        </Badge>
      )}
      <AlertTriangle size={12} className="text-destructive/60 shrink-0" />
    </button>
  );
}
