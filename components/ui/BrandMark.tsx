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
      <rect x="2" y="2" width="44" height="44" rx="14" fill="var(--candy-coral)" />
      <path
        d="M18.2 31.8c2.7 5.8 12.2 7.6 18.1 2.2 5.2-4.7 2.1-12.7-3.6-11.2-4.7 1.2-5.4 7-1.4 8.7 3.1 1.3 5.5-.9 4.6-3.4"
        fill="none"
        stroke="var(--candy-mint)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 21.8c0-6.7 4.7-11.4 11-11.4 6.1 0 10.6 4.5 10.6 10.8 0 6.7-4.5 11.5-10.8 11.5-6.2 0-10.8-4.4-10.8-10.9Z"
        fill="var(--candy-mint)"
      />
      <circle cx="17.2" cy="19.1" r="5.1" fill="var(--surface)" />
      <circle cx="17.8" cy="19.6" r="2.55" fill="var(--ink)" />
      <circle cx="16.9" cy="18.7" r="0.85" fill="var(--surface)" />
      <path d="M8.8 22.2c2.1 1 3.8.9 5.3-.1" fill="none" stroke="var(--ink)" strokeWidth="1.55" strokeLinecap="round" />
      <path d="m22.8 8.1 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.3 1.3.4-2.6-1.9-1.8 2.7-.4Z" fill="var(--candy-lemon)" />
    </svg>
  );
}
