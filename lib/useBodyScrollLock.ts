"use client";

import { useEffect } from "react";

let activeLocks = 0;
let overflowBeforeFirstLock = "";

function acquireBodyScrollLock() {
  if (activeLocks === 0) {
    overflowBeforeFirstLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  activeLocks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0) {
      document.body.style.overflow = overflowBeforeFirstLock;
      overflowBeforeFirstLock = "";
    }
  };
}

/**
 * Reference-counted page scroll lock.
 *
 * Immersive stages and result dialogs can overlap for a render. Keeping one
 * shared lock count prevents one surface from restoring body scrolling while
 * the other surface is still open.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    return acquireBodyScrollLock();
  }, [locked]);
}
