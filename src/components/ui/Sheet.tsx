import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useDragToDismiss } from "@/hooks/useDragToDismiss";

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Accessible bottom sheet used for filters, favorites, settings and details.
 * Slides up from the bottom (CSS animation) and can be dismissed by dragging the
 * handle down, in addition to the close button.
 */
export function Sheet({ open, title, onClose, children }: SheetProps) {
  const { t } = useTranslation();

  const { offset, dragging, handlers } = useDragToDismiss({
    enabled: open,
    onDismiss: onClose,
  });

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="absolute inset-0 z-50 flex flex-col justify-end overflow-hidden"
    >
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="sheet-backdrop-enter absolute inset-0 cursor-default bg-slate-900/40"
      />
      <div
        data-testid="sheet-content"
        style={
          dragging
            ? { transform: `translateY(${offset}px)`, transition: "none" }
            : undefined
        }
        className="sheet-enter relative max-h-[85%] overflow-y-auto rounded-t-2xl bg-white px-4 pt-1 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-slate-900 dark:text-slate-100"
      >
        {/* Drag handle: swipe down to dismiss. */}
        <div
          data-testid="sheet-handle"
          {...handlers}
          className="mx-auto mb-1 flex h-6 w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        >
          <span
            aria-hidden
            className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600"
          />
        </div>

        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-full px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
