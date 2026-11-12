import { useId } from 'react';

/** Auroreel's mark: a play triangle made of three theme bands, on a night tile. */
export function LogoMark({ size = 28 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d1533" />
          <stop offset="1" stopColor="#0b0a12" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset=".5" stopColor="#d946ef" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <clipPath id={`${id}p`}>
          <path d="M24 17.5c0-2.7 2.9-4.4 5.3-3l20 12.5c2.2 1.4 2.2 4.6 0 6L29.3 45.5c-2.4 1.4-5.3-.3-5.3-3Z" />
        </clipPath>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id}t)`} />
      <rect
        x=".75"
        y=".75"
        width="62.5"
        height="62.5"
        rx="15.25"
        fill="none"
        stroke="#fff"
        strokeOpacity=".12"
        strokeWidth="1.5"
      />
      <g clipPath={`url(#${id}p)`}>
        <rect x="20" y="10" width="34" height="44" fill={`url(#${id}b)`} />
        <rect x="20" y="25" width="34" height="2.5" fill="#0b0a12" opacity=".55" />
        <rect x="20" y="36" width="34" height="2.5" fill="#0b0a12" opacity=".55" />
      </g>
    </svg>
  );
}
