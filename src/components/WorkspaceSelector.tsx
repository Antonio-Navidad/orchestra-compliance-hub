import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, ChevronDown } from "lucide-react";
import { useState } from "react";

export function WorkspaceSelector() {
  const { workspaces, currentWorkspace, switchWorkspace, currentMemberRole } = useWorkspace();
  const [open, setOpen] = useState(false);

  if (!currentWorkspace) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs font-mono max-w-[180px]"
        >
          <Building2 className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate">{currentWorkspace.name}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <div className="px-2 py-1.5 border-b border-border mb-1">
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest">WORKSPACES</span>
        </div>
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => { switchWorkspace(ws.id); setOpen(false); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted/50 text-left"
          >
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate flex-1 font-medium">{ws.name}</span>
            {ws.id === currentWorkspace.id && (
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </button>
        ))}
        {currentMemberRole && (
          <div className="px-2 py-1.5 border-t border-border mt-1">
            <Badge variant="outline" className="text-[9px] font-mono">
              {currentMemberRole.toUpperCase()}
            </Badge>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
