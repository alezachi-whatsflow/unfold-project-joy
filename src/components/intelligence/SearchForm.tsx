import { useState } from "react";
import { Globe, Instagram, Linkedin, MapPin, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SourceType } from "@/types/intelligence";
import { cn } from "@/lib/utils";

const SOURCE_OPTIONS: { type: SourceType; label: string; icon: React.ElementType; placeholder: string; enabled: boolean }[] = [
  { type: "website", label: "Website", icon: Globe, placeholder: "https://exemplo.com.br", enabled: true },
  { type: "instagram", label: "Instagram", icon: Instagram, placeholder: "@usuario", enabled: true },
  { type: "google_maps", label: "Perfil da Empresa", icon: MapPin, placeholder: "Nome do negócio + cidade (ex: Padaria Bella Vila São Paulo)", enabled: true },
  { type: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "linkedin.com/in/usuario", enabled: false },
];

interface SearchFormProps {
  onSearch: (query: string, sourceType: SourceType) => void;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("website");

  const selected = SOURCE_OPTIONS.find((s) => s.type === sourceType)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSearch(query.trim(), sourceType);
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-6 space-y-4">
        {/* Source type tabs */}
        <div className="flex gap-2">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              disabled={!opt.enabled}
              onClick={() => opt.enabled && setSourceType(opt.type)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                opt.type === sourceType
                  ? "bg-primary text-primary-foreground"
                  : opt.enabled
                  ? "bg-secondary text-secondary-foreground hover:bg-accent"
                  : "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
              )}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
              {!opt.enabled && <span className="text-[10px] opacity-70">(em breve)</span>}
            </button>
          ))}
        </div>

        {/* Search input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={selected.placeholder}
              className="pl-10 bg-input border-border"
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              "Analisar"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
