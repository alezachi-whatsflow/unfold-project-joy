/**
 * SmartCombobox — Zero Friction inline selector with instant create
 * Type a name → select from list OR create new with Enter
 */
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Plus, Check } from "lucide-react";

interface Option {
  id: string;
  name: string;
  color?: string;
}

interface Props {
  options: Option[];
  value: string | null;
  onChange: (id: string | null, name: string) => void;
  onCreateNew?: (name: string) => Promise<Option>;
  placeholder?: string;
  className?: string;
}

export function SmartCombobox({ options, value, onChange, onCreateNew, placeholder, className }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Set display value from selected option
  const selectedOption = options.find((o) => o.id === value);
  const displayValue = selectedOption?.name || "";

  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search
    ? options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  const exactMatch = options.find((o) => o.name.toLowerCase() === search.toLowerCase());
  const showCreateOption = search.trim() && !exactMatch && onCreateNew;

  const handleSelect = (opt: Option) => {
    onChange(opt.id, opt.name);
    setIsOpen(false);
    setSearch("");
  };

  const handleCreate = async () => {
    if (!onCreateNew || !search.trim()) return;
    setCreating(true);
    try {
      const newOpt = await onCreateNew(search.trim());
      onChange(newOpt.id, newOpt.name);
      setIsOpen(false);
      setSearch("");
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length === 1) {
        handleSelect(filtered[0]);
      } else if (showCreateOption) {
        handleCreate();
      }
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className || ""}`}>
      <Input
        ref={inputRef}
        value={isOpen ? search : displayValue}
        onChange={(e) => { setSearch(e.target.value); if (!isOpen) setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Buscar ou criar..."}
        className="h-8 text-xs"
      />

      {isOpen && (
        <div
          ref={dropRef}
          className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
        >
          {filtered.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-left transition-colors"
            >
              {opt.color && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
              )}
              <span className="truncate flex-1">{opt.name}</span>
              {opt.id === value && <Check className="h-3 w-3 text-primary shrink-0" />}
            </button>
          ))}

          {showCreateOption && (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-primary hover:bg-primary/10 border-t border-border transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>{creating ? "Criando..." : `Criar "${search.trim()}"`}</span>
              <span className="ml-auto text-[9px] text-muted-foreground">Enter</span>
            </button>
          )}

          {filtered.length === 0 && !showCreateOption && (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
              Nenhum resultado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
