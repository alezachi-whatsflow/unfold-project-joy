import { useState, useCallback } from "react";
import { Search, Users, Download, History, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NicheContextBanner } from "./prospeccao/NicheContextBanner";
import { LeadCard } from "./prospeccao/LeadCard";
import { CampaignHistory } from "./prospeccao/CampaignHistory";
import { findNicheContext } from "@/lib/nicheContext";

const NICHOS = [
  "Escola particular", "Clínica odontológica", "Pet shop", "Academia",
  "Restaurante", "Escritório de contabilidade", "Imobiliária", "Salão de beleza",
  "Farmácia", "Oficina mecânica", "Clínica veterinária", "Loja de roupas",
  "Padaria", "Estúdio de pilates", "Consultório médico",
];

export interface ProspectLead {
  id: string;
  name: string;
  url: string;
  description: string | null;
  hasSite: boolean;
  hasPhone: boolean;
  phone: string | null;
  score: number;
}

function extractLeadsFromSearch(results: any[]): ProspectLead[] {
  return results.map((r: any, i: number) => {
    const title = r.title || r.url || `Lead ${i + 1}`;
    const md = (r.markdown || "").toLowerCase();
    const desc = r.description || null;

    // Try to extract phone from markdown
    const phoneMatch = md.match(/\(?\d{2}\)?\s?\d{4,5}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : null;

    // Score: higher = more opportunity (weaker digital = better prospect)
    let score = 5;
    const contentLen = (r.markdown || "").length;
    if (contentLen < 500) score += 2; // Thin content = opportunity
    if (!phone) score += 1; // No visible phone = weak CTA
    if (contentLen > 3000) score -= 2; // Strong content = less opportunity
    if (md.includes("whatsapp") || md.includes("wa.me")) score -= 1;
    score = Math.max(1, Math.min(10, score));

    return {
      id: `lead-${i}-${Date.now()}`,
      name: title.substring(0, 80),
      url: r.url || "",
      description: desc,
      hasSite: true,
      hasPhone: !!phone,
      phone,
      score,
    };
  });
}

function exportLeadsCSV(leads: ProspectLead[], niche: string, city: string) {
  const BOM = "\uFEFF";
  const header = "Nome,URL,Telefone,Score,Nicho,Cidade\n";
  const rows = leads.map((l) =>
    `"${l.name}","${l.url}","${l.phone || ""}",${l.score},"${niche}","${city}"`
  ).join("\n");
  const blob = new Blob([BOM + header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${niche.replace(/\s/g, "-")}-${city.replace(/\s/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProspeccaoTab() {
  const [nichoQuery, setNichoQuery] = useState("");
  const [city, setCity] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [leads, setLeads] = useState<ProspectLead[]>([]);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  const filtered = NICHOS.filter((n) => n.toLowerCase().includes(nichoQuery.toLowerCase()));
  const nicheCtx = findNicheContext(nichoQuery);

  const handleSearch = useCallback(async () => {
    if (!nichoQuery.trim()) return;
    const searchCity = city.trim() || "São Paulo";
    setIsSearching(true);
    setSearched(true);
    setLeads([]);

    try {
      const query = `${nichoQuery.trim()} em ${searchCity} telefone endereço`;
      const { data, error } = await supabase.functions.invoke("firecrawl-search", {
        body: { query, options: { limit: 10, lang: "pt-br", country: "br" } },
      });

      if (error) throw new Error(error.message);
      if (!data?.success && data?.error) throw new Error(data.error);

      const results = data?.data || [];
      if (results.length === 0) {
        toast({ title: "Nenhum resultado", description: "Tente outro nicho ou cidade.", variant: "destructive" });
        return;
      }

      const extracted = extractLeadsFromSearch(results);
      setLeads(extracted.sort((a, b) => b.score - a.score));

      // Save campaign to history
      const hotCount = extracted.filter((l) => l.score >= 8).length;
      await supabase.from("prospect_campaigns").insert({
        niche: nichoQuery.trim(),
        city: searchCity,
        leads_found: extracted.length,
        leads_analyzed: extracted.length,
        hot_leads: hotCount,
        results: extracted as any,
      });

      toast({ title: "Busca concluída", description: `${extracted.length} leads encontrados.` });
    } catch (err: any) {
      console.error("Search error:", err);
      toast({ title: "Erro na busca", description: err.message || "Falha ao buscar leads.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, [nichoQuery, city, toast]);

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Label className="mb-1.5 block text-xs text-muted-foreground">Segmento de mercado</Label>
              <Input
                placeholder="Ex: Clínica odontológica"
                value={nichoQuery}
                onChange={(e) => { setNichoQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              {showSuggestions && nichoQuery && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full border bg-popover p-1 max-h-48 overflow-auto">
                  {filtered.map((n) => (
                    <button key={n} className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent hover:text-accent-foreground" onClick={() => { setNichoQuery(n); setShowSuggestions(false); }}>{n}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:w-56">
              <Label className="mb-1.5 block text-xs text-muted-foreground">Cidade / Região</Label>
              <Input placeholder="Ex: São Paulo" value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} disabled={isSearching} className="gap-2">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar Leads
              </Button>
              <Button variant="outline" size="icon" onClick={() => setShowHistory(!showHistory)} title="Histórico">
                <History className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign History */}
      {showHistory && <CampaignHistory onLoadCampaign={(campaign) => {
        setNichoQuery(campaign.niche);
        setCity(campaign.city);
        setLeads(campaign.results as ProspectLead[]);
        setSearched(true);
        setShowHistory(false);
      }} />}

      {/* Niche Context Card */}
      {nicheCtx && searched && <NicheContextBanner context={nicheCtx} />}

      {/* Empty state */}
      {!searched && !showHistory && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="rounded-full bg-primary/10 p-6"><Users className="h-12 w-12 text-primary" /></div>
          <p className="text-muted-foreground text-sm max-w-sm">Busque por segmento e cidade para encontrar seus próximos clientes via Firecrawl</p>
        </div>
      )}

      {/* Loading */}
      {isSearching && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Buscando leads reais via Firecrawl...</p>
        </div>
      )}

      {/* Results */}
      {searched && !isSearching && leads.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{leads.length} leads encontrados</p>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => exportLeadsCSV(leads, nichoQuery, city || "São Paulo")}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} niche={nichoQuery} city={city || "São Paulo"} />
            ))}
          </div>
        </>
      )}

      {searched && !isSearching && leads.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead encontrado. Tente outro segmento ou cidade.</p>
      )}
    </div>
  );
}
