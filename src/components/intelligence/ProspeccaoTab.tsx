import { useState, useRef, useEffect } from "react";
import { Search, Globe, Instagram, MapPin, Phone, Building2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const NICHOS = [
  "Escola particular",
  "Clínica odontológica",
  "Pet shop",
  "Academia",
  "Restaurante",
  "Escritório de contabilidade",
  "Imobiliária",
  "Salão de beleza",
  "Farmácia",
  "Oficina mecânica",
  "Clínica veterinária",
  "Loja de roupas",
  "Padaria",
  "Estúdio de pilates",
  "Consultório médico",
];

interface MockLead {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  hasSite: boolean;
  hasInstagram: boolean;
  hasGoogleMaps: boolean;
  niche: string;
}

const generateMockLeads = (niche: string, city: string): MockLead[] => [
  { id: "1", name: `${niche} Central`, address: `Rua das Flores, 123 - ${city}`, phone: "(11) 99999-0001", hasSite: true, hasInstagram: true, hasGoogleMaps: true, niche },
  { id: "2", name: `${niche} Premium`, address: `Av. Brasil, 456 - ${city}`, phone: "(11) 99999-0002", hasSite: true, hasInstagram: false, hasGoogleMaps: true, niche },
  { id: "3", name: `${niche} Express`, address: `Rua Augusta, 789 - ${city}`, phone: null, hasSite: false, hasInstagram: true, hasGoogleMaps: true, niche },
  { id: "4", name: `${niche} Plus`, address: `Av. Paulista, 1000 - ${city}`, phone: "(11) 99999-0004", hasSite: true, hasInstagram: true, hasGoogleMaps: false, niche },
  { id: "5", name: `${niche} Master`, address: `Rua Consolação, 200 - ${city}`, phone: "(11) 99999-0005", hasSite: false, hasInstagram: false, hasGoogleMaps: true, niche },
  { id: "6", name: `${niche} Top`, address: `Av. Rebouças, 350 - ${city}`, phone: null, hasSite: true, hasInstagram: true, hasGoogleMaps: true, niche },
];

export function ProspeccaoTab() {
  const [nichoQuery, setNichoQuery] = useState("");
  const [city, setCity] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [leads, setLeads] = useState<MockLead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filtered = NICHOS.filter((n) =>
    n.toLowerCase().includes(nichoQuery.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = () => {
    if (!nichoQuery.trim()) return;
    setLeads(generateMockLeads(nichoQuery.trim(), city.trim() || "São Paulo"));
    setSelected(new Set());
    setSearched(true);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const PresenceIcon = ({ active, children }: { active: boolean; children: React.ReactNode }) => (
    <span className={active ? "text-[hsl(var(--primary))]" : "text-muted-foreground/40"}>
      {children}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative" ref={suggestionsRef}>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Segmento de mercado</Label>
              <Input
                placeholder="Ex: Clínica odontológica"
                value={nichoQuery}
                onChange={(e) => { setNichoQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              {showSuggestions && nichoQuery && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md max-h-48 overflow-auto">
                  {filtered.map((n) => (
                    <button
                      key={n}
                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent hover:text-accent-foreground"
                      onClick={() => { setNichoQuery(n); setShowSuggestions(false); }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:w-56">
              <Label className="mb-1.5 block text-xs text-muted-foreground">Cidade / Região</Label>
              <Input
                placeholder="Ex: São Paulo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full sm:w-auto gap-2">
                <Search className="h-4 w-4" /> Buscar Leads
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {!searched && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="rounded-full bg-primary/10 p-6">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm max-w-sm">
            Busque por segmento e cidade para encontrar seus próximos clientes
          </p>
        </div>
      )}

      {/* Results grid */}
      {searched && leads.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leads.map((lead) => (
            <Card key={lead.id} className={`relative transition-colors ${selected.has(lead.id) ? "ring-2 ring-primary" : ""}`}>
              <div className="absolute top-3 right-3">
                <Checkbox
                  checked={selected.has(lead.id)}
                  onCheckedChange={() => toggleSelect(lead.id)}
                />
              </div>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" /> {lead.address}
                    </p>
                  </div>
                </div>
                {lead.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {lead.phone}
                  </p>
                )}
                <div className="flex gap-3 pt-1 border-t border-border">
                  <PresenceIcon active={lead.hasSite}><Globe className="h-4 w-4" /></PresenceIcon>
                  <PresenceIcon active={lead.hasInstagram}><Instagram className="h-4 w-4" /></PresenceIcon>
                  <PresenceIcon active={lead.hasGoogleMaps}><MapPin className="h-4 w-4" /></PresenceIcon>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sticky footer */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <span className="text-sm font-medium">{selected.size} lead{selected.size > 1 ? "s" : ""} selecionado{selected.size > 1 ? "s" : ""}</span>
            <Button className="gap-2">
              <Search className="h-4 w-4" /> Analisar Selecionados
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
