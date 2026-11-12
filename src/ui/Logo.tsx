import { useId } from 'react';

/** Auroreel's mark: a play triangle of three solid bands on a night tile (flat, no gradients). */
export function LogoMark({ size = 28 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <clipPath id={`${id}p`}>
          <path d="M24 17.5c0-2.7 2.9-4.4 5.3-3l20 12.5c2.2 1.4 2.2 4.6 0 6L29.3 45.5c-2.4 1.4-5.3-.3-5.3-3Z" />
        </clipPath>
      </defs>
      <rect width="64" height="64" rx="16" fill="#14101f" />
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
        <rect x="20" y="10" width="34" height="15" fill="#8b5cf6" />
        <rect x="20" y="27.5" width="34" height="8.5" fill="#d946ef" />
        <rect x="20" y="38.5" width="34" height="16" fill="#f97316" />
      </g>
    </svg>
  );
}
