import React, { useState } from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="px-3 py-2">
      <div
        className="flex items-center gap-3 rounded-lg px-3 py-1.5"
        style={{
          backgroundColor: "var(--wa-bg-input)",
          border: focused ? "1px solid var(--wa-green)" : "1px solid transparent",
          transition: "border-color 150ms ease",
        }}
      >
        <Search size={18} style={{ color: "var(--wa-text-secondary)" }} className="shrink-0" />
        <input
          className="flex-1 bg-transparent border-none outline-none text-sm"
          style={{ color: "var(--wa-text-primary)", fontSize: 14 }}
          placeholder="Pesquisar ou começar uma nova conversa"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
}
