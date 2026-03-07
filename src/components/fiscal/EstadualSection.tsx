import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UFData } from "@/lib/taxData";

interface Props {
  data: UFData[];
  onChange: (data: UFData[]) => void;
}

const REGIMES = [
  { value: "simples", label: "Simples Nacional" },
  { value: "presumido", label: "Lucro Presumido" },
  { value: "real", label: "Lucro Real" },
];

export default function EstadualSection({ data, onChange }: Props) {
  const update = (idx: number, patch: Partial<UFData>) => {
    const updated = [...data];
    updated[idx] = { ...updated[idx], ...patch };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Alíquotas ICMS por estado — pré-populado com valores de referência (editáveis)</p>
      <div className="rounded-lg border border-border/40 overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">UF</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-28">ICMS Int. %</TableHead>
              <TableHead className="w-28">ICMS Inter. %</TableHead>
              <TableHead className="w-20">DIFAL</TableHead>
              <TableHead className="w-20">ST</TableHead>
              <TableHead className="w-44">Regime</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((uf, i) => (
              <TableRow key={uf.uf}>
                <TableCell className="font-mono font-bold">{uf.uf}</TableCell>
                <TableCell className="text-xs">{uf.nome}</TableCell>
                <TableCell>
                  <Input type="number" step="any" className="h-8 w-20 text-xs" value={uf.icmsInterno}
                    onChange={e => update(i, { icmsInterno: Number(e.target.value) })} />
                </TableCell>
                <TableCell>
                  <Input type="number" step="any" className="h-8 w-20 text-xs" value={uf.icmsInterestadual}
                    onChange={e => update(i, { icmsInterestadual: Number(e.target.value) })} />
                </TableCell>
                <TableCell><Switch checked={uf.difal} onCheckedChange={v => update(i, { difal: v })} /></TableCell>
                <TableCell><Switch checked={uf.substituicaoTributaria} onCheckedChange={v => update(i, { substituicaoTributaria: v })} /></TableCell>
                <TableCell>
                  <Select value={uf.regimeTributario} onValueChange={(v: any) => update(i, { regimeTributario: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REGIMES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
