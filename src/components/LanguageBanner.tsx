import { X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES, translations } from "@/lib/i18n/translations";
import { Button } from "@/components/ui/button";

export function LanguageBanner() {
  const { showBanner, bannerNewLang, bannerPrevLang, undoLanguageChange, dismissBanner } = useLanguage();

  if (!showBanner || !bannerNewLang || !bannerPrevLang) return null;

  const newLangLabel = LANGUAGES.find(l => l.code === bannerNewLang)?.nativeLabel || bannerNewLang;
  const prevLangLabel = LANGUAGES.find(l => l.code === bannerPrevLang)?.nativeLabel || bannerPrevLang;

  // Build messages in both languages
  const newDict = translations[bannerNewLang] || translations.en;
  const prevDict = translations[bannerPrevLang] || translations.en;

  const msgNew = (newDict["lang.changed"] || "Language changed to {lang}.").replace("{lang}", newLangLabel);
  const undoNew = newDict["lang.undo"] || "Click here to undo.";
  const msgPrev = (prevDict["lang.changed"] || "Language changed to {lang}.").replace("{lang}", newLangLabel);
  const undoPrev = prevDict["lang.undo"] || "Click here to undo.";

  // Don't show duplicate if same language
  const showDual = bannerNewLang !== bannerPrevLang;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground px-4 py-2 flex items-center justify-center gap-4 text-xs font-mono shadow-lg animate-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span>{msgNew} <button onClick={undoLanguageChange} className="underline hover:opacity-80 font-semibold">{undoNew}</button></span>
        {showDual && (
          <span className="opacity-80">{msgPrev} <button onClick={undoLanguageChange} className="underline hover:opacity-80 font-semibold">{undoPrev}</button></span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={dismissBanner}
        className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20 shrink-0"
      >
        <X size={14} />
      </Button>
    </div>
  );
}
