type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="1" y="1" width="46" height="46" rx="15" fill="var(--surface)" />
      <rect x="7" y="5" width="34" height="39" rx="10" fill="var(--candy-coral)" />
      <rect
        x="11"
        y="9"
        width="26"
        height="19"
        rx="6"
        fill="color-mix(in srgb, var(--candy-sky) 30%, var(--surface))"
      />
      <path
        d="m24 12.2 2.05 4.15 4.58.67-3.31 3.23.78 4.56-4.1-2.16-4.1 2.16.78-4.56-3.31-3.23 4.58-.67Z"
        fill="var(--candy-lemon)"
        stroke="var(--candy-lemon)"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path d="M9.5 29h29L36 40H12Z" fill="var(--surface)" />
      <path
        d="M18.5 33.5v4.25"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="18.5" cy="33" r="2.8" fill="var(--candy-mint)" />
      <circle cx="29.5" cy="35.5" r="3" fill="var(--candy-lemon)" />
      <rect x="16" y="40.5" width="16" height="2.25" rx="1.125" fill="var(--ink)" opacity="0.42" />
    </svg>
  );
}
