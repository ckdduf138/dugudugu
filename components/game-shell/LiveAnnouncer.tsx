"use client";

import { useEffect, useState } from "react";

export type LiveAnnouncerProps = {
  /** The complete sentence a screen reader should announce. */
  message: string | null | undefined;
  politeness?: "polite" | "assertive";
  /** Change this when the same message needs to be announced again. */
  announcementKey?: string | number;
};

/**
 * A persistent, visually-hidden live region for game beats and results.
 *
 * The message is committed on the next animation frame so an already-mounted
 * region reliably announces repeated rounds. No timing in the game depends on
 * this frame; it is only an accessibility notification.
 */
export function LiveAnnouncer({
  message,
  politeness = "polite",
  announcementKey,
}: LiveAnnouncerProps) {
  const [announced, setAnnounced] = useState("");

  useEffect(() => {
    let announceFrame: number | null = null;
    const clearFrame = requestAnimationFrame(() => {
      setAnnounced("");
      if (message) {
        announceFrame = requestAnimationFrame(() => setAnnounced(message));
      }
    });
    return () => {
      cancelAnimationFrame(clearFrame);
      if (announceFrame !== null) cancelAnimationFrame(announceFrame);
    };
  }, [message, announcementKey]);

  return (
    <span
      className="sr-only"
      role={politeness === "assertive" ? "alert" : "status"}
      aria-live={politeness}
      aria-atomic="true"
    >
      {announced}
    </span>
  );
}
