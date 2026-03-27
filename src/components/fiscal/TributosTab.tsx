import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Landmark } from "lucide-react";
import MunicipalSection from "./MunicipalSection";
import EstadualSection from "./EstadualSection";
import FederalSection from "./FederalSection";
import { UF_LIST, SIMPLES_NACIONAL_DEFAULT, FEDERAL_DEFAULTS, type MunicipalISS, type UFData, type SimplesNacionalFaixa, type FederalConfig } from "@/lib/taxData";
import { toast } from "sonner";

const STORAGE_KEY = "fiscal_tributos";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveState(state: any) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function TributosTab() {
  const saved = loadState();
  const [municipal, setMunicipal] = useState<MunicipalISS[]>(saved?.municipal ?? []);
  const [estadual, setEstadual] = useState<UFData[]>(saved?.estadual ?? [...UF_LIST]);
  const [simples, setSimples] = useState<SimplesNacionalFaixa[]>(saved?.simples ?? [...SIMPLES_NACIONAL_DEFAULT]);
  const [presumido, setPresumido] = useState<FederalConfig>(saved?.presumido ?? { ...FEDERAL_DEFAULTS.presumido });
  const [real, setReal] = useState<FederalConfig>(saved?.real ?? { ...FEDERAL_DEFAULTS.real });

  useEffect(() => {
    saveState({ municipal, estadual, simples, presumido, real });
  }, [municipal, estadual, simples, presumido, real]);

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
