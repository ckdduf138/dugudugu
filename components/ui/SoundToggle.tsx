"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSettings } from "@/stores/settings";

export function SoundToggle({ label }: { label: string }) {
  const sound = useSettings((s) => s.sound);
  const toggle = useSettings((s) => s.toggleSound);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={sound}
      className="grid h-11 w-11 place-items-center rounded-full border border-black/[0.07] bg-surface/95 text-ink-soft shadow-[0_8px_20px_rgba(52,39,58,0.1)] transition-transform hover:scale-105 active:scale-95"
    >
      {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
