/** Marca provisória do ecossistema: dois arcos (Lab e Incubadora) que convergem num ponto. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="lg-lab" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--lab)" />
          <stop offset="1" stopColor="var(--brand)" />
        </linearGradient>
        <linearGradient id="lg-inc" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--inc)" />
          <stop offset="1" stopColor="var(--ai)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="var(--fg)" />
      <path d="M9 28c0-9 5-16 11-16" stroke="url(#lg-lab)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M31 28c0-9-5-16-11-16" stroke="url(#lg-inc)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="29" r="3.2" fill="var(--bg)" />
    </svg>
  );
}
