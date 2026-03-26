import React from "react";
import { cn } from "@/lib/utils";

interface MetaBusinessPartnerBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { radius: 7, px: 9, py: 5, gap: 6, icon: 14, title: 10, sub: 8 },
  md: { radius: 9, px: 12, py: 7, gap: 8, icon: 20, title: 11, sub: 9 },
  lg: { radius: 12, px: 16, py: 10, gap: 10, icon: 28, title: 13, sub: 10 },
} as const;

export function MetaBusinessPartnerBadge({ size = "md", className }: MetaBusinessPartnerBadgeProps) {
  const s = SIZES[size];

  return (
    <div
      className={cn("inline-flex items-center", className)}
      style={{
        background: "#0082FB",
        borderRadius: s.radius,
        padding: `${s.py}px ${s.px}px`,
        gap: s.gap,
      }}
    >
      {/* Meta infinity symbol */}
      <svg viewBox="0 0 38 38" width={s.icon} height={s.icon} xmlns="http://www.w3.org/2000/svg">
        <path
          d="M19 14.5C16.8 11.5 14.2 9.8 11.8 9.8C8.6 9.8 6 12.8 6 19C6 25.2 8.6 28.2 11.8 28.2C14.2 28.2 16.8 26.5 19 23.5C21.2 26.5 23.8 28.2 26.2 28.2C29.4 28.2 32 25.2 32 19C32 12.8 29.4 9.8 26.2 9.8C23.8 9.8 21.2 11.5 19 14.5Z"
          stroke="white"
          strokeWidth={2.8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <ellipse cx={11.8} cy={19} rx={2.8} ry={4.8} fill="white" opacity={0.3} />
        <ellipse cx={26.2} cy={19} rx={2.8} ry={4.8} fill="white" opacity={0.3} />
      </svg>

      {/* Text */}
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
        <span style={{ fontSize: s.title, fontWeight: 700, color: "#FFFFFF" }}>Meta</span>
        <span style={{ fontSize: s.sub, fontWeight: 400, color: "rgba(255,255,255,0.85)" }}>Business Partner</span>
      </div>
    </div>
  );
}

export default MetaBusinessPartnerBadge;
