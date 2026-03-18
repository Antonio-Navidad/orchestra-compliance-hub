import { Globe } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES } from "@/lib/i18n/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  collapsed?: boolean;
}

export function LanguageSwitcher({ collapsed }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const current = LANGUAGES.find(l => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-muted-foreground hover:text-foreground h-auto p-1",
            collapsed ? "w-8 justify-center" : "justify-start gap-1 text-[10px] font-mono"
          )}
          title={current?.nativeLabel}
        >
          <Globe size={collapsed ? 14 : 10} />
          {!collapsed && (
            <span className="truncate">{current?.nativeLabel || "English"}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-48 max-h-80 overflow-y-auto"
      >
        {/* Label always in English for safety */}
        <DropdownMenuLabel className="text-[10px] font-mono text-muted-foreground">
          Select language
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "text-sm cursor-pointer",
              language === lang.code && "bg-accent font-medium"
            )}
          >
            <span className="flex-1">{lang.nativeLabel}</span>
            {language === lang.code && (
              <span className="text-primary text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
