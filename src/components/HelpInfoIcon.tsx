import { useState } from "react";
import { Info } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FUNCTION_HELP } from "@/lib/helpContent";
import { cn } from "@/lib/utils";

interface HelpInfoIconProps {
  helpKey: string;
  className?: string;
  size?: number;
}

export function HelpInfoIcon({ helpKey, className, size = 14 }: HelpInfoIconProps) {
  const [open, setOpen] = useState(false);
  const content = FUNCTION_HELP[helpKey];
  if (!content) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors p-0.5",
          className
        )}
        aria-label={`Help: ${content.title}`}
      >
        <Info size={size} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[380px] sm:w-[420px]">
          <SheetHeader>
            <SheetTitle className="text-sm font-bold font-mono tracking-tight">
              {content.title}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 text-xs leading-relaxed text-muted-foreground whitespace-pre-line prose prose-sm dark:prose-invert max-w-none">
            {content.body.split("\n").map((line, i) => {
              if (line.startsWith("**") && line.endsWith("**")) {
                return <p key={i} className="font-semibold text-foreground mt-3 mb-1">{line.replace(/\*\*/g, "")}</p>;
              }
              if (line.startsWith("• ")) {
                return <p key={i} className="ml-3">{line}</p>;
              }
              if (line.trim() === "") return <br key={i} />;
              // Handle inline bold
              const parts = line.split(/(\*\*[^*]+\*\*)/g);
              return (
                <p key={i}>
                  {parts.map((part, j) =>
                    part.startsWith("**") && part.endsWith("**")
                      ? <span key={j} className="font-semibold text-foreground">{part.replace(/\*\*/g, "")}</span>
                      : part
                  )}
                </p>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
