import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SIMPLES_NACIONAL_DEFAULT, FEDERAL_DEFAULTS, type SimplesNacionalFaixa, type FederalConfig } from "@/lib/taxData";

interface Props {
  simplesData: SimplesNacionalFaixa[];
  onSimplesChange: (d: SimplesNacionalFaixa[]) => void;
  presumidoData: FederalConfig;
  onPresumidoChange: (d: FederalConfig) => void;
  realData: FederalConfig;
  onRealChange: (d: FederalConfig) => void;
}

export default function FederalSection({ simplesData, onSimplesChange, presumidoData, onPresumidoChange, realData, onRealChange }: Props) {
  const updateSimples = (idx: number, key: keyof SimplesNacionalFaixa, val: number) => {
    const updated = [...simplesData];
    updated[idx] = { ...updated[idx], [key]: val };
    onSimplesChange(updated);
  };

  const renderConfigForm = (config: FederalConfig, onChange: (c: FederalConfig) => void, label: string) => (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            ["irpj", "IRPJ (%)"],
            ["csll", "CSLL (%)"],
            ["pis", "PIS (%)"],
            ["cofins", "COFINS (%)"],
          ] as const).map(([key, lbl]) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs">{lbl}</Label>
              <Input type="number" step="any" className="h-8 text-xs" value={config[key]}
                onChange={e => onChange({ ...config, [key]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Tributos federais por regime tributário — valores editáveis</p>
      <Tabs defaultValue="simples">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="simples" className="text-xs">Simples Nacional</TabsTrigger>
          <TabsTrigger value="presumido" className="text-xs">Lucro Presumido</TabsTrigger>
          <TabsTrigger value="real" className="text-xs">Lucro Real</TabsTrigger>
        </TabsList>

        <TabsContent value="simples">
          <div className="border border-border/40 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anexo</TableHead>
                  <TableHead>Faixa de Receita</TableHead>
                  <TableHead>Alíquota %</TableHead>
                  <TableHead>IRPJ %</TableHead>
                  <TableHead>CSLL %</TableHead>
                  <TableHead>COFINS %</TableHead>
                  <TableHead>PIS %</TableHead>
                  <TableHead>ISS %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simplesData.map((f, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono font-bold">{f.anexo}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{f.faixaReceita}</TableCell>
                    {(["aliquota", "irpj", "csll", "cofins", "pis", "iss"] as const).map(k => (
                      <TableCell key={k}>
                        <Input type="number" step="any" className="h-7 w-16 text-xs"
                          value={f[k]} onChange={e => updateSimples(i, k, Number(e.target.value))} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="presumido">
          {renderConfigForm(presumidoData, onPresumidoChange, "Lucro Presumido")}
        </TabsContent>

        <TabsContent value="real">
          {renderConfigForm(realData, onRealChange, "Lucro Real")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
