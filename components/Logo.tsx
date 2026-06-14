// OpenRoles logo mark — a rounded badge with an indigo→green gradient and an
// "open" ring with an outward arrow (open roles). Pure SVG, crisp at any size.
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="OpenRoles"
    >
      <defs>
        <linearGradient id="orLogoGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="url(#orLogoGrad)" />
      {/* open ring */}
      <path
        d="M21 11.4A7.4 7.4 0 1 0 23 16.5"
        stroke="#fff"
        strokeWidth="2.7"
        strokeLinecap="round"
      />
      {/* outward arrow */}
      <path
        d="M19.2 10.2 24 9l-1.1 4.8"
        stroke="#fff"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
