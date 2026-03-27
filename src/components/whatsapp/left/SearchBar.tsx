import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [local, setLocal] = useState(value);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync from parent
  useEffect(() => { setLocal(value); }, [value]);

  function handleChange(v: string) {
    setLocal(v);
    if (v.length >= 2) {
      setIsDebouncing(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange(v);
        setIsDebouncing(false);
      }, 300);
    } else {
      clearTimeout(timerRef.current);
      onChange(v);
      setIsDebouncing(false);
    }
  }

  return (
    <div className="px-3 py-2 border-b border-border">
      <div className="relative">
        {isDebouncing ? (
          <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin pointer-events-none" />
        ) : (
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        )}
        <input
          className="w-full bg-muted rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
          placeholder="Pesquisar conversa..."
          value={local}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>
    </div>
  );
}
