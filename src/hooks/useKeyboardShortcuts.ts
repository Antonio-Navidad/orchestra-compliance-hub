import { useEffect, useCallback, useRef } from "react";

interface ShortcutHandlers {
  onNewShipment: () => void;
  onCloseDrawer: () => void;
  onNextCard?: () => void;
  onExpandCard?: () => void;
}

export function useKeyboardShortcuts({
  onNewShipment,
  onCloseDrawer,
  onNextCard,
  onExpandCard,
}: ShortcutHandlers) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't fire shortcuts when typing in inputs
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if ((e.target as HTMLElement)?.isContentEditable) return;

    switch (e.key) {
      case 'n':
      case 'N':
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          onNewShipment();
        }
        break;
      case 'Escape':
        onCloseDrawer();
        break;
      case 'Tab':
        if (onNextCard && !e.metaKey && !e.ctrlKey) {
          // Let default tab work but could be extended for card navigation
        }
        break;
      case 'Enter':
        if (onExpandCard) {
          // Could expand focused card
        }
        break;
    }
  }, [onNewShipment, onCloseDrawer, onNextCard, onExpandCard]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
