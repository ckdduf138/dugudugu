"use client";

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { spring } from "@/lib/motion";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { LiveAnnouncer } from "./LiveAnnouncer";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.hidden && element.getAttribute("aria-hidden") !== "true",
  );
}

type ResultDialogBaseProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  hero?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  celebration?: ReactNode;
  presentation?: "modal" | "stage";
  /** A plain-text result sentence for assistive technology. */
  announcement: string;
  announcementKey?: string | number;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
};

export type ResultDialogProps = ResultDialogBaseProps &
  (
    | {
        dismissible: true;
        onClose: () => void;
        closeLabel: string;
      }
    | {
        dismissible?: false;
        onClose?: never;
        closeLabel?: never;
      }
  );

/** Accessible result reveal with focus containment and restoration. */
export function ResultDialog({
  open,
  title,
  description,
  hero,
  children,
  actions,
  celebration,
  presentation = "modal",
  announcement,
  announcementKey,
  onClose,
  dismissible = false,
  closeLabel,
  initialFocusRef,
  className = "",
}: ResultDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const reduceMotion = useReducedMotion();

  useBodyScrollLock(open);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusFrame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const requestedTarget = initialFocusRef?.current;
      const target =
        (requestedTarget && dialog.contains(requestedTarget)
          ? requestedTarget
          : null) ??
        focusableElements(dialog)[0] ??
        dialog;
      target.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (event.key === "Escape" && dismissible && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;
      const items = focusableElements(dialog);
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [dismissible, initialFocusRef, open]);

  if (!open) return null;

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && dismissible) onClose?.();
  };

  return (
    <div
      className={
        presentation === "stage"
          ? "fixed inset-0 z-30 grid place-items-end overscroll-contain overflow-y-auto bg-[linear-gradient(180deg,transparent_0%,transparent_28%,color-mix(in_srgb,var(--ink)_32%,transparent)_100%)] p-3 sm:place-items-center sm:p-6"
          : "fixed inset-0 z-30 grid place-items-center overscroll-contain overflow-y-auto bg-gradient-to-b from-candy-pink/45 via-surface/95 to-candy-sky/45 p-4 sm:p-6"
      }
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 1rem)",
        paddingRight: "calc(env(safe-area-inset-right) + 1rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
        paddingLeft: "calc(env(safe-area-inset-left) + 1rem)",
      }}
      onMouseDown={closeFromBackdrop}
    >
      <LiveAnnouncer
        message={announcement}
        announcementKey={announcementKey}
        politeness="assertive"
      />
      {celebration ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {celebration}
        </div>
      ) : null}

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.84, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={spring.bouncy}
        style={{
          maxHeight:
            "calc(100svh - 2rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
        }}
        className={`relative w-full max-w-md overscroll-contain overflow-y-auto rounded-[var(--radius-lg)] border border-ink/10 bg-surface p-5 text-center shadow-[var(--shadow-toy)] outline-none sm:p-7 ${
          presentation === "stage"
            ? "mb-[max(0rem,env(safe-area-inset-bottom))] bg-[linear-gradient(155deg,var(--surface),color-mix(in_srgb,var(--candy-lemon)_7%,var(--surface)))]"
            : ""
        } ${className}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {dismissible && onClose && closeLabel ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-ink/5 text-ink-soft outline-none transition hover:bg-ink/10 hover:text-ink focus-visible:ring-4 focus-visible:ring-candy-sky/35"
          >
            <X aria-hidden size={20} strokeWidth={2.5} />
          </button>
        ) : null}

        {hero ? <div className="mb-3">{hero}</div> : null}
        <h2 id={titleId} className="font-display text-3xl text-ink sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <div id={descriptionId} className="mt-2 text-sm font-bold text-ink-soft">
            {description}
          </div>
        ) : null}
        <div className="mt-5">{children}</div>
        {actions ? <div className="mt-6 grid gap-2 sm:grid-cols-2">{actions}</div> : null}
      </motion.div>
    </div>
  );
}
