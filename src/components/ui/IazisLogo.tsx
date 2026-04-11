/**
 * IAZIS Logo — SVG inline component
 * Placeholder until official brand assets are provided.
 * Renders modular icon (IA + ZIS panels with neon border)
 */

interface IazisLogoProps {
  size?: number
  className?: string
  showWordmark?: boolean
}

export function IazisLogo({ size = 32, className = "", showWordmark = false }: IazisLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Outer container with neon border */}
        <rect x="2" y="2" width="60" height="60" rx="12" stroke="#478BFF" strokeWidth="1.5" fill="#0D0E14" />

        {/* Top panel (IA) */}
        <rect x="8" y="7" width="48" height="22" rx="8" stroke="#1E3757" strokeWidth="1" fill="#121419" />
        <text x="18" y="24" fontFamily="'Geist Mono', monospace" fontSize="14" fontWeight="500" fill="#E5E8ED">I</text>
        {/* Mesh lines */}
        <path d="M20 15 Q22 13 24 15" stroke="#39F7B2" strokeWidth="0.8" fill="none" opacity="0.7" />
        <path d="M21 17 Q23 15 25 17" stroke="#39F7B2" strokeWidth="0.6" fill="none" opacity="0.5" />
        <path d="M22 19 Q24 17 26 19" stroke="#39F7B2" strokeWidth="0.4" fill="none" opacity="0.3" />
        <text x="36" y="24" fontFamily="'Geist Mono', monospace" fontSize="14" fontWeight="500" fill="#E5E8ED">A</text>
        {/* Cyan arrows */}
        <path d="M35 14 L33 16 L35 18" stroke="#39F7B2" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M47 14 L49 16 L47 18" stroke="#39F7B2" strokeWidth="1" fill="none" strokeLinecap="round" />

        {/* Bottom panel (ZIS) */}
        <rect x="8" y="35" width="48" height="22" rx="8" stroke="#1E3757" strokeWidth="1" fill="#121419" />
        <text x="16" y="51" fontFamily="'Geist Mono', monospace" fontSize="11" fontWeight="600" letterSpacing="3" fill="#478BFF">ZIS</text>
      </svg>

      {/* Wordmark (optional) */}
      {showWordmark && (
        <div className="flex flex-col">
          <span className="font-mono text-sm font-bold tracking-wider text-foreground leading-none">
            IAZIS
          </span>
          <span className="font-mono text-[7px] tracking-[0.2em] text-[#478BFF] leading-none mt-0.5">
            AMBIENT INTELLIGENCE
          </span>
        </div>
      )}
    </div>
  )
}

/** Small icon-only version for favicon/avatar contexts */
export function IazisIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <rect x="1" y="1" width="22" height="22" rx="5" stroke="#478BFF" strokeWidth="1" fill="#0D0E14" />
      <rect x="3" y="3" width="18" height="8" rx="3" fill="#121419" stroke="#1E3757" strokeWidth="0.5" />
      <text x="6" y="9.5" fontFamily="monospace" fontSize="5.5" fontWeight="700" fill="#E5E8ED">IA</text>
      <rect x="3" y="13" width="18" height="8" rx="3" fill="#121419" stroke="#1E3757" strokeWidth="0.5" />
      <text x="5" y="19.5" fontFamily="monospace" fontSize="5" fontWeight="700" fill="#478BFF">ZIS</text>
    </svg>
  )
}

// Backward compatibility aliases
export const PzaafiLogo = IazisLogo;
export const PzaafiIcon = IazisIcon;
