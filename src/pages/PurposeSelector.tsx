import { useNavigate } from "react-router-dom";
import { useWorkspacePurpose, WORKSPACE_PURPOSES } from "@/hooks/useWorkspacePurpose";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PurposeSelector() {
  const { setPurpose } = useWorkspacePurpose();
  const navigate = useNavigate();

  const handleSelect = (purposeId: string) => {
    setPurpose(purposeId as any);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Activity size={20} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">ORCHESTRA</h1>
      </div>
      <p className="text-muted-foreground text-sm font-mono mb-10 tracking-widest">
        AI LOGISTICS PLATFORM
      </p>

      <h2 className="text-lg font-semibold text-foreground mb-2">
        What are you here to do?
      </h2>
      <p className="text-muted-foreground text-sm mb-8 text-center max-w-md">
        Choose your workspace focus. You can switch anytime from the top bar.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {WORKSPACE_PURPOSES.map((wp) => (
          <button
            key={wp.id}
            onClick={() => handleSelect(wp.id)}
            className={cn(
              "group relative flex flex-col items-start p-6 rounded-xl border border-border",
              "bg-card hover:bg-accent/50 transition-all duration-200",
              "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
              "text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          >
            <span className="text-3xl mb-3">{wp.icon}</span>
            <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
              {wp.label}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {wp.subtitle}
            </p>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
          </button>
        ))}
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/50 mt-10 tracking-widest">
        WORKSPACE · PURPOSE · FOCUS
      </p>
    </div>
  );
}
