"use client";

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import Image from "next/image";
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

const NON_CONTENT_ELEMENTS = new Set(["LINK", "SCRIPT", "STYLE", "TEMPLATE"]);

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) =>
      !element.hidden &&
      !element.closest("[inert], [aria-hidden='true']"),
  );
}

function resultFocusScope(dialog: HTMLElement): HTMLElement[] {
  return focusableElements(dialog);
}

type IsolatedElement = {
  element: HTMLElement;
  ariaHidden: string | null;
  inert: boolean;
  hadInertAttribute: boolean;
};

/** Hide every page branch behind the active result surface. */
function isolateResultBackground(overlay: HTMLElement) {
  const isolated: IsolatedElement[] = [];
  let current: HTMLElement = overlay;

  while (current.parentElement) {
    const parent = current.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (!(sibling instanceof HTMLElement) || sibling === current) continue;
      if (NON_CONTENT_ELEMENTS.has(sibling.tagName)) continue;

      isolated.push({
        element: sibling,
        ariaHidden: sibling.getAttribute("aria-hidden"),
        inert: sibling.inert,
        hadInertAttribute: sibling.hasAttribute("inert"),
      });
      sibling.inert = true;
      sibling.setAttribute("inert", "");
      sibling.setAttribute("aria-hidden", "true");
    }

    current = parent;
    if (parent === document.body) break;
  }

  return () => {
    for (const state of isolated) {
      state.element.inert = state.inert;
      if (state.hadInertAttribute) state.element.setAttribute("inert", "");
      else state.element.removeAttribute("inert");

      if (state.ariaHidden === null) state.element.removeAttribute("aria-hidden");
      else state.element.setAttribute("aria-hidden", state.ariaHidden);
    }
  };
}

type ResultDialogBaseProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  hero?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  celebration?: ReactNode;
  /** Decorative mascot anchored in an upper popup corner, never in result content. */
  mascot?: "peeker";
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
  mascot,
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
  const overlayRef = useRef<HTMLDivElement>(null);
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
    const overlay = overlayRef.current;
    const restoreBackground = overlay
      ? isolateResultBackground(overlay)
      : () => undefined;
    const focusFrame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const requestedTarget = initialFocusRef?.current;
      const target =
        (requestedTarget && dialog.contains(requestedTarget)
          ? requestedTarget
          : null) ??
        resultFocusScope(dialog)[0] ??
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
      const items = resultFocusScope(dialog);
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const activeElement = document.activeElement;
      if (!items.includes(activeElement as HTMLElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      restoreBackground();
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [dismissible, initialFocusRef, open]);

  if (!open) return null;

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && dismissible) onClose?.();
  };

  return (
    <div
      ref={overlayRef}
      data-result-dialog-overlay
      className={
        presentation === "stage"
          ? "fixed inset-0 z-30 grid h-[100svh] min-h-0 w-full min-w-0 items-end justify-items-center overflow-hidden overscroll-none bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--surface)_8%,transparent)_24%,color-mix(in_srgb,var(--ink)_16%,var(--surface))_68%,color-mix(in_srgb,var(--ink)_26%,var(--surface))_100%)] sm:place-items-center"
          : "fixed inset-0 z-30 grid h-[100svh] min-h-0 w-full min-w-0 place-items-center overflow-hidden overscroll-none bg-gradient-to-b from-candy-pink/45 via-surface/95 to-candy-sky/45"
      }
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
        paddingRight: "calc(env(safe-area-inset-right) + 0.75rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        paddingLeft: "calc(env(safe-area-inset-left) + 0.75rem)",
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
        style={{ maxHeight: "100%" }}
        className={`isolate relative flex min-h-0 min-w-0 w-full max-w-full flex-col ${
          mascot ? "overflow-visible" : "overflow-hidden"
        } overscroll-contain rounded-[var(--radius-lg)] border border-ink/10 bg-surface px-5 pb-5 text-center shadow-[var(--shadow-toy)] outline-none sm:max-w-md sm:px-7 sm:pb-7 ${
          dismissible ? "pt-16 sm:pt-16" : "pt-5 sm:pt-7"
        } ${
          presentation === "stage"
            ? "mb-[max(0rem,env(safe-area-inset-bottom))] bg-[linear-gradient(155deg,var(--surface),color-mix(in_srgb,var(--candy-lemon)_7%,var(--surface)))]"
            : ""
        } ${className}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Image
          aria-hidden="true"
          src="/images/brand/dugu-mascot-640.webp"
          alt=""
          width={640}
          height={640}
          className="pointer-events-none absolute -bottom-16 -right-14 -z-10 h-auto w-52 select-none opacity-[0.075]"
        />

        {mascot === "peeker" ? (
          <motion.div
            aria-hidden="true"
            initial={
              reduceMotion
                ? false
                : { opacity: 0, x: -14, y: -8 }
            }
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { ...spring.gentle, delay: 0.1 }
            }
            className="pointer-events-none absolute -left-6 -top-[4.4rem] z-20 w-36 origin-bottom-left select-none sm:-top-[4.9rem] sm:w-40"
          >
            <Image
              src="/images/brand/dugu-result-peeker.png"
              alt=""
              width={1536}
              height={1024}
              loading="eager"
              className="h-auto w-full drop-shadow-[0_8px_10px_color-mix(in_srgb,var(--ink)_14%,transparent)]"
            />
          </motion.div>
        ) : null}

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

        <div
          data-result-dialog-scroll-region
          role="document"
          aria-labelledby={titleId}
          tabIndex={0}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain outline-none [scrollbar-width:none] focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-candy-sky/25 [&::-webkit-scrollbar]:hidden"
        >
          {hero ? <div className="mb-3">{hero}</div> : null}
          <h2 id={titleId} className="font-display text-3xl text-ink sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <div id={descriptionId} className="mt-2 text-sm font-bold text-ink-soft">
              {description}
            </div>
          ) : null}
          <div className="mt-5 min-w-0">{children}</div>
        </div>
        {actions ? (
          <div className="mt-4 grid shrink-0 gap-2 sm:mt-6 sm:grid-cols-2">
            {actions}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
