export function SantaHat({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Red Cone body folded slightly to the right */}
      <path
        d="M20 75 C 25 50, 45 25, 75 22 C 85 20, 88 32, 78 40 C 60 52, 50 68, 80 75 Z"
        fill="#DC2626"
      />
      {/* Red shading / fold highlight */}
      <path
        d="M32 73 C 38 52, 52 35, 74 24 C 65 30, 52 50, 48 73 Z"
        fill="#B91C1C"
        opacity="0.6"
      />
      {/* White Pom-pom ball on tip */}
      <circle cx="82" cy="38" r="9" fill="#FFFFFF" />
      <circle cx="82" cy="38" r="7" fill="#F8FAFC" />
      <circle cx="80" cy="36" r="3" fill="#FFFFFF" opacity="0.9" />

      {/* Fluffy White Trim base */}
      <rect x="15" y="72" width="68" height="15" rx="7.5" fill="#FFFFFF" />
      {/* Fluff texture highlights */}
      <ellipse cx="28" cy="80" rx="7" ry="5" fill="#F1F5F9" />
      <ellipse cx="48" cy="80" rx="8" ry="5" fill="#F8FAFC" />
      <ellipse cx="68" cy="80" rx="7" ry="5" fill="#F1F5F9" />
    </svg>
  );
}
