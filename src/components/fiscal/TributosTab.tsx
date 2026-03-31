import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Landmark } from "lucide-react";
import MunicipalSection from "./MunicipalSection";
import EstadualSection from "./EstadualSection";
import FederalSection from "./FederalSection";
import { UF_LIST, SIMPLES_NACIONAL_DEFAULT, FEDERAL_DEFAULTS, type MunicipalISS, type UFData, type SimplesNacionalFaixa, type FederalConfig } from "@/lib/taxData";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

const STORAGE_KEY = "fiscal_tributos";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export default function TributosTab() {
  const tenantId = useTenantId();
  const saved = loadState();
  const [municipal, setMunicipal] = useState<MunicipalISS[]>(saved?.municipal ?? []);
  const [estadual, setEstadual] = useState<UFData[]>(saved?.estadual ?? [...UF_LIST]);
  const [simples, setSimples] = useState<SimplesNacionalFaixa[]>(saved?.simples ?? [...SIMPLES_NACIONAL_DEFAULT]);
  const [presumido, setPresumido] = useState<FederalConfig>(saved?.presumido ?? { ...FEDERAL_DEFAULTS.presumido });

  // Load from DB on mount
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("tax_configurations")
        .select("*")
        .eq("tenant_id", tenantId);
      if (data && data.length > 0) {
        // Group by scope and reconstruct state
        const byScope: Record<string, any[]> = {};
        for (const row of data) {
          if (!byScope[row.scope]) byScope[row.scope] = [];
          byScope[row.scope].push(row);
        }
        if (byScope.municipal) setMunicipal(byScope.municipal.map((r: any) => r.metadata));
        if (byScope.estadual) setEstadual(byScope.estadual.map((r: any) => r.metadata));
        if (byScope.federal) {
          const simplesRows = byScope.federal.filter((r: any) => r.tax_type === "simples");
          const presumidoRow = byScope.federal.find((r: any) => r.tax_type === "presumido");
          if (simplesRows.length) setSimples(simplesRows.map((r: any) => r.metadata));
          if (presumidoRow) setPresumido(presumidoRow.metadata);
        }
        localStorage.removeItem(STORAGE_KEY);
      }
    })();
  }, [tenantId]);
  const [real, setReal] = useState<FederalConfig>(saved?.real ?? { ...FEDERAL_DEFAULTS.real });

  // Persist to DB (debounced via effect)
  useEffect(() => {
    if (!tenantId) {
      // Fallback to localStorage if no tenant
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ municipal, estadual, simples, presumido, real })); } catch {}
      return;
    }
    // Save all tax configs to DB as individual rows
    const saveToDb = async () => {
      const rows: any[] = [];
      municipal.forEach((m, i) => rows.push({ tenant_id: tenantId, scope: "municipal", name: m.nome || `ISS-${i}`, tax_type: "ISS", rate: m.aliquota, metadata: m }));
      estadual.forEach((e) => rows.push({ tenant_id: tenantId, scope: "estadual", name: e.uf, tax_type: "ICMS", rate: e.aliquota, uf: e.uf, metadata: e }));
      simples.forEach((s, i) => rows.push({ tenant_id: tenantId, scope: "federal", name: `Faixa-${i + 1}`, tax_type: "simples", rate: s.aliquota, faixa_min: s.faturamentoMin, faixa_max: s.faturamentoMax, metadata: s }));
      rows.push({ tenant_id: tenantId, scope: "federal", name: "Presumido", tax_type: "presumido", rate: 0, metadata: presumido });
      rows.push({ tenant_id: tenantId, scope: "federal", name: "Real", tax_type: "real", rate: 0, metadata: real });

      // Delete old and insert new (simplest approach for this structure)
      await (supabase as any).from("tax_configurations").delete().eq("tenant_id", tenantId);
      const { error } = await (supabase as any).from("tax_configurations").insert(rows);
      if (error) console.error("[TributosTab] Save error:", error);
      else localStorage.removeItem(STORAGE_KEY);
    };
    const t = setTimeout(saveToDb, 1000); // debounce 1s
    return () => clearTimeout(t);
  }, [municipal, estadual, simples, presumido, real, tenantId]);

  const handleMunicipalChange = (entries: MunicipalISS[]) => {
    setMunicipal(entries);
    toast.success("Alíquotas municipais atualizadas");
  };

  const handleEstadualChange = (data: UFData[]) => {
    setEstadual(data);
  };

  return (
    <Accordion type="multiple" defaultValue={["municipal", "estadual", "federal"]} className="space-y-3">
      <AccordionItem value="municipal" className="border border-border/40 px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-medium">Municipal — ISS</span>
            <Badge variant="secondary" className="text-[10px] ml-1">{municipal.length}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <MunicipalSection entries={municipal} onChange={handleMunicipalChange} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="estadual" className="border border-border/40 px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium">Estadual — ICMS</span>
            <Badge variant="secondary" className="text-[10px] ml-1">{estadual.length}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <EstadualSection data={estadual} onChange={handleEstadualChange} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="federal" className="border border-border/40 px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            <span className="font-medium">Federal — PIS, COFINS, CSLL, IRPJ</span>
            <Badge variant="secondary" className="text-[10px] ml-1">{simples.length + 2}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <FederalSection
            simplesData={simples} onSimplesChange={setSimples}
            presumidoData={presumido} onPresumidoChange={setPresumido}
            realData={real} onRealChange={setReal}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
