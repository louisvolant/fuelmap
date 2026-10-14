import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { PanelSide } from "@/stores/layoutStore";

interface SidePanelProps {
  side: PanelSide;
  title: string;
  onClose: () => void;
  /** Switch the panel to the other side of the screen. */
  onToggleSide: () => void;
  children: ReactNode;
}

/** Right/left sliding panel used for station details on wide viewports. */
export function SidePanel({
  side,
  title,
  onClose,
  onToggleSide,
  children,
}: SidePanelProps) {
  const { t } = useTranslation();
  const toggleLabel =
    side === "right" ? t("panel.moveLeft") : t("panel.moveRight");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={[
        "pointer-events-auto absolute inset-y-0 z-40 flex w-[min(400px,92vw)] flex-col bg-white shadow-2xl dark:bg-slate-900 dark:text-slate-100",
        side === "right" ? "right-0" : "left-0",
      ].join(" ")}
    >
      <header className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
        <h2 className="truncate text-base font-semibold">{title}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSide}
            aria-label={toggleLabel}
            title={toggleLabel}
            className="rounded-full px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span aria-hidden>{side === "right" ? "⇤" : "⇥"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-full px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ×
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}
