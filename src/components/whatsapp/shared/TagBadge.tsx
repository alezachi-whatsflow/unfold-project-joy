import React from "react";

interface TagBadgeProps {
  label: string;
  color: "ai" | "client" | "lead" | "support" | "transfer";
}

const tagStyles: Record<string, { bg: string; border: string; text: string }> = {
  ai:       { bg: "rgba(124,58,237,0.2)",  border: "rgba(124,58,237,0.6)",  text: "#A78BFA" },
  client:   { bg: "rgba(14,165,233,0.2)",  border: "rgba(14,165,233,0.6)",  text: "#38BDF8" },
  lead:     { bg: "rgba(16,185,129,0.2)",  border: "rgba(16,185,129,0.6)",  text: "#34D399" },
  support:  { bg: "rgba(245,158,11,0.2)",  border: "rgba(245,158,11,0.6)",  text: "#FBBF24" },
  transfer: { bg: "rgba(239,68,68,0.2)",   border: "rgba(239,68,68,0.6)",   text: "#F87171" },
};

const TagBadge = React.memo(function TagBadge({ label, color }: TagBadgeProps) {
  const s = tagStyles[color] || tagStyles.lead;
  return (
    <span
      className="inline-flex items-center rounded-full uppercase font-medium select-none"
      style={{
        height: 18,
        fontSize: 10,
        padding: "0 6px",
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
      }}
    >
      {label}
    </span>
  );
});

export default TagBadge;
