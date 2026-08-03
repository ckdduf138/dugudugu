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
      <rect width="48" height="48" rx="15" fill="var(--surface)" />
      <rect x="4" y="4" width="40" height="40" rx="12" fill="var(--ink)" />
      <circle cx="16" cy="18" r="5" fill="var(--candy-coral)" />
      <circle cx="32" cy="18" r="5" fill="var(--candy-lemon)" />
      <circle cx="14.5" cy="16.5" r="1.35" fill="var(--surface)" opacity="0.78" />
      <circle cx="30.5" cy="16.5" r="1.35" fill="var(--surface)" opacity="0.78" />
      <path
        d="M13.5 30.5c3.3 5.2 17.7 5.2 21 0"
        fill="none"
        stroke="var(--surface)"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
