/** A half ring split into four segments, filled left to right with hatched lime, like the reference health gauge. */
export function Gauge({ value, label }: { value: number; label: string }) {
  const cx = 120;
  const cy = 118;
  const r = 86;
  const segs = 4;
  const gap = 0.018;
  const point = (t: number) => {
    const a = Math.PI * (1 - t);
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy - r * Math.sin(a)).toFixed(2)}`;
  };
  const arc = (a: number, b: number) => `M ${point(a)} A ${r} ${r} 0 0 1 ${point(b)}`;
  const v = Math.min(1, Math.max(0, value));

  return (
    <figure className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 240 132" className="w-full" role="img" aria-label={`${Math.round(v * 100)}% ${label}`}>
        <defs>
          <pattern id="gauge-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#9fd04e" />
            <rect width="1.6" height="6" fill="rgb(255 255 255 / 0.35)" />
          </pattern>
        </defs>
        {Array.from({ length: segs }, (_, i) => {
          const a = i / segs + (i ? gap : 0);
          const b = (i + 1) / segs - (i < segs - 1 ? gap : 0);
          const filledTo = Math.min(b, v);
          return (
            <g key={i}>
              <path d={arc(a, b)} stroke="#e6e6e6" strokeWidth="34" fill="none" />
              {filledTo > a && <path d={arc(a, filledTo)} stroke="url(#gauge-hatch)" strokeWidth="34" fill="none" />}
            </g>
          );
        })}
      </svg>
      <figcaption className="absolute inset-x-0 bottom-0 text-center">
        <span className="block text-[28px] font-bold leading-none tracking-[-0.02em]">{Math.round(v * 100)}%</span>
        <span className="mt-1 block text-[11px] text-ink-soft">{label}</span>
      </figcaption>
    </figure>
  );
}
