import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface HSCodeValidatorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  destinationCountry?: string;
}

export function HSCodeValidator({ value, onChange, className, destinationCountry }: HSCodeValidatorProps) {
  const [validationStatus, setValidationStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [description, setDescription] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const validateCode = useCallback(async (code: string) => {
    const cleaned = code.replace(/[^0-9.]/g, "").trim();
    if (cleaned.length < 4) {
      setValidationStatus("idle");
      setDescription("");
      return;
    }

    setValidationStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("classify-product", {
        body: {
          title: `Reverse lookup for HS code: ${cleaned}`,
          description: `Validate HS code ${cleaned} and return its official description.`,
          destinationCountry: destinationCountry || "US",
        },
      });

      if (error) throw error;

      if (data?.primaryCode && data?.primaryDescription) {
        setValidationStatus("valid");
        setDescription(data.primaryDescription);
      } else {
        setValidationStatus("invalid");
        setDescription("HS code not recognized — verify before submitting");
      }
    } catch {
      setValidationStatus("idle");
      setDescription("");
    }
  }, [destinationCountry]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.replace(/[^0-9]/g, "").length >= 4) {
        validateCode(value);
      } else {
        setValidationStatus("idle");
        setDescription("");
      }
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, validateCode]);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter HS code (e.g. 6109.10.00)"
          className={cn(
            "h-8 text-xs font-mono pr-8",
            validationStatus === "valid" && "border-emerald-500/50 focus-visible:ring-emerald-500/30",
            validationStatus === "invalid" && "border-destructive/50 focus-visible:ring-destructive/30"
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {validationStatus === "loading" && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
          {validationStatus === "valid" && <CheckCircle size={12} className="text-emerald-500" />}
          {validationStatus === "invalid" && <AlertTriangle size={12} className="text-destructive" />}
        </div>
      </div>
      {description && (
        <p className={cn(
          "text-[10px] font-mono px-1",
          validationStatus === "valid" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
        )}>
          {validationStatus === "valid" && <CheckCircle size={8} className="inline mr-1" />}
          {validationStatus === "invalid" && <AlertTriangle size={8} className="inline mr-1" />}
          {description}
        </p>
      )}
    </div>
  );
}
