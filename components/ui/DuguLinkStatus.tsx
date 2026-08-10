"use client";

import { useLinkStatus } from "next/link";
import { createPortal } from "react-dom";
import { DuguLoader } from "./DuguLoader";

type Props = {
  label: string;
  title: string;
};

/** Must remain a descendant of the Next Link whose transition it reports. */
export function DuguLinkStatus({ label, title }: Props) {
  const { pending } = useLinkStatus();

  if (!pending || typeof document === "undefined") return null;

  return createPortal(
    <DuguLoader label={label} title={title} overlay delayed />,
    document.body,
  );
}
