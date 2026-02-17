import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

export interface UnmatchedLine {
  index: number;
  subcategory: string;
  description: string;
  block: string;
  monthValues: Record<string, number>;
}

interface SelectedLine extends UnmatchedLine {
  selected: boolean;
  category: string;
}

const AVAILABLE_CATEGORIES = [
  "Despesas Comerciais",
  "Despesas Financeiras",
  "Custos de Prestação do Serviço (CSP)",
  "Tecnologia Interna / P&D (OPEX)",
  "Impostos sobre Vendas e sobre Serviços",
  "Outras Despesas",
  "Funcionários / Prestação de Serviço",
];

interface UnmatchedLinesDialogProps {
  open: boolean;
  lines: UnmatchedLine[];
  onConfirm: (lines: { line: UnmatchedLine; category: string }[]) => void;
  onCancel: () => void;
}

export function UnmatchedLinesDialog({ open, lines, onConfirm, onCancel }: UnmatchedLinesDialogProps) {
  const [selected, setSelected] = useState<SelectedLine[]>([]);
  const [lastLinesRef, setLastLinesRef] = useState<UnmatchedLine[]>([]);

  // Re-sync state when lines array actually changes
  if (lines !== lastLinesRef && lines.length > 0) {
    setLastLinesRef(lines);
    setSelected(lines.map((l) => ({ ...l, selected: true, category: "Outras Despesas" })));
  }

  const toggleLine = (index: number) => {
    setSelected((prev) =>
      prev.map((s) => (s.index === index ? { ...s, selected: !s.selected } : s))
    );
  };

  const setCategory = (index: number, category: string) => {
    setSelected((prev) =>
      prev.map((s) => (s.index === index ? { ...s, category } : s))
    );
  };

  const handleConfirm = () => {
    const chosen = selected
      .filter((s) => s.selected)
      .map((s) => ({ line: s as UnmatchedLine, category: s.category }));
    onConfirm(chosen);
  };

  const selectedCount = selected.filter((s) => s.selected).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Linhas não reconhecidas no CSV
          </DialogTitle>
          <DialogDescription>
            {lines.length} linha(s) não correspondem a nenhuma subcategoria existente.
            Selecione quais deseja importar e escolha a categoria para cada uma.
            Serão criadas como "Diversos (descrição)".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {selected.map((line) => (
            <div
              key={line.index}
              className="flex items-start gap-3 rounded-lg border border-border p-3 bg-secondary/30"
            >
              <Checkbox
                checked={line.selected}
                onCheckedChange={() => toggleLine(line.index)}
                className="mt-1"
              />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="text-sm font-medium truncate">{line.subcategory}</div>
                {line.description && (
                  <div className="text-xs text-muted-foreground truncate">{line.description}</div>
                )}
                <Select
                  value={line.category}
                  onValueChange={(val) => setCategory(line.index, val)}
                  disabled={!line.selected}
                >
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Ignorar todas
          </Button>
          <Button onClick={handleConfirm} disabled={selectedCount === 0}>
            Importar {selectedCount} linha(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
