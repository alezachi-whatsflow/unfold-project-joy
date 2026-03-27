import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import MunicipalFormDialog from "./MunicipalFormDialog";
import type { MunicipalISS } from "@/lib/taxData";

interface Props {
  entries: MunicipalISS[];
  onChange: (entries: MunicipalISS[]) => void;
}

export default function MunicipalSection({ entries, onChange }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<MunicipalISS | null>(null);

  const handleSave = (entry: MunicipalISS) => {
    const idx = entries.findIndex(e => e.id === entry.id);
    if (idx >= 0) {
      const updated = [...entries];
      updated[idx] = entry;
      onChange(updated);
    } else {
      onChange([...entries, entry]);
    }
  };

  const handleEdit = (entry: MunicipalISS) => {
    setEditEntry(entry);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    onChange(entries.filter(e => e.id !== id));
  };

  const handleAdd = () => {
    setEditEntry(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Configure as alíquotas de ISS por município</p>
        <Button size="sm" onClick={handleAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Adicionar Município
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Nenhum município cadastrado</div>
      ) : (
        <div className="border border-border/40 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Município</TableHead>
                <TableHead>IBGE</TableHead>
                <TableHead>ISS %</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Retido</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.municipio}</TableCell>
                  <TableCell className="font-mono text-xs">{e.codigoIBGE}</TableCell>
                  <TableCell>{e.aliquotaISS.toFixed(2)}%</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">{e.servicoLC116}</TableCell>
                  <TableCell>
                    <Badge variant={e.issRetido ? "default" : "secondary"} className="text-[10px]">
                      {e.issRetido ? "Sim" : "Não"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <MunicipalFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} editEntry={editEntry} />
    </div>
  );
}
