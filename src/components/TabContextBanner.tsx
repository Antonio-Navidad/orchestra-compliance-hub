import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const STORAGE_KEY = "orchestra-dismissed-banners";

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch { return new Set(); }
}

function dismiss(tabId: string) {
  const s = getDismissed();
  s.add(tabId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
}

export function TabContextBanner({ tabId }: { tabId: string }) {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  const messageKey = `tabBanner.${tabId}.message`;
  const actionKey = `tabBanner.${tabId}.action`;
  const message = t(messageKey);
  const action = t(actionKey);

  // If the key returns itself, there's no banner for this tab
  const hasBanner = message !== messageKey;

  useEffect(() => {
    if (!hasBanner) return;
    setVisible(!getDismissed().has(tabId));
  }, [tabId, hasBanner]);

  if (!hasBanner || !visible) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 mb-4">
      <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground">
          {message}
          {action && action !== actionKey && (
            <span className="text-primary font-medium ml-1">{action}</span>
          )}
        </p>
      </div>
      <button
        onClick={() => { dismiss(tabId); setVisible(false); }}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
