import { useState, useRef, useEffect } from "react";
import { useCostLines } from "@/contexts/CostLinesContext";
import { CostLineWithValues, BLOCK_LABELS, COST_TYPE_LABELS, CostBlock } from "@/types/costLines";
import { formatCurrency, getMonthLabel } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, Plus, Trash2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

function CurrencyCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <div
        className="cursor-pointer px-2 py-1.5 text-right text-xs font-display hover:bg-secondary rounded transition-colors min-w-[100px]"
        onClick={() => {
          setText(value === 0 ? "" : value.toString());
          setEditing(true);
        }}
      >
        {value === 0 ? (
          <span className="text-muted-foreground/40">R$ 0,00</span>
        ) : (
          formatCurrency(value)
        )}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
      step="0.01"
      className="w-[100px] px-2 py-1 text-right text-xs bg-secondary border border-primary/30 rounded outline-none font-display"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        onChange(parseFloat(text) || 0);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onChange(parseFloat(text) || 0);
          setEditing(false);
        }
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}

function CategorySection({
  category,
  lines,
  months,
}: {
  category: string;
  lines: CostLineWithValues[];
  months: string[];
}) {
  const [open, setOpen] = useState(true);
  const { setAmount, getCategoryTotal } = useCostLines();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 bg-secondary/60 hover:bg-secondary rounded-md transition-colors text-left">
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-xs font-semibold text-foreground flex-1">
          {category}
        </span>
        {months.map((m) => (
          <span
            key={m}
            className="text-xs font-display text-muted-foreground min-w-[100px] text-right"
          >
            {formatCurrency(getCategoryTotal(category, m))}
          </span>
        ))}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-0">
          {lines.map((line) => (
            <div
              key={line.id}
              className="flex items-center gap-2 px-3 py-1 border-b border-border/30 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    {line.block}
                  </span>
                  <span className="text-xs text-foreground truncate">
                    {line.subcategory}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {COST_TYPE_LABELS[line.costType]}
                  </span>
                </div>
              </div>
              {months.map((m) => (
                <CurrencyCell
                  key={m}
                  value={line.values[m] ?? 0}
                  onChange={(v) => setAmount(line.id, m, v)}
                />
              ))}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AddLineDialog() {
  const { addTemplate } = useCostLines();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [block, setBlock] = useState<CostBlock>("CSP");
  const [costType, setCostType] = useState<"fixed" | "variable" | "mixed">("variable");
  const [supplier, setSupplier] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = () => {
    if (!category || !subcategory) {
      toast.error("Preencha categoria e subcategoria");
      return;
    }
    addTemplate({ category, subcategory, block, costType, supplier, description });
    toast.success("Linha de custo adicionada!");
    setOpen(false);
    setCategory("");
    setSubcategory("");
    setSupplier("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Nova Linha
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Linha de Custo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Categoria</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Despesas Comerciais"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Subcategoria</Label>
            <Input
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="Ex: Google Ads (mídia paga)"
              className="h-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Bloco</Label>
              <Select value={block} onValueChange={(v) => setBlock(v as CostBlock)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(BLOCK_LABELS) as CostBlock[]).map((b) => (
                    <SelectItem key={b} value={b}>
                      {b} — {BLOCK_LABELS[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={costType} onValueChange={(v) => setCostType(v as any)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixo</SelectItem>
                  <SelectItem value="variable">Variável</SelectItem>
                  <SelectItem value="mixed">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fornecedor</Label>
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Ex: Google Ads"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição"
              className="h-9 text-sm"
            />
          </div>
          <Button onClick={handleAdd} className="w-full">
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MonthSelector({
  months,
  setMonths,
}: {
  months: string[];
  setMonths: (m: string[]) => void;
}) {
  const addMonth = () => {
    if (months.length >= 6) return;
    const last = months[months.length - 1];
    const [y, m] = last.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${(m + 1).toString().padStart(2, "0")}`;
    setMonths([...months, next]);
  };

  const removeMonth = () => {
    if (months.length <= 1) return;
    setMonths(months.slice(0, -1));
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={removeMonth} disabled={months.length <= 1}>
        −
      </Button>
      <span className="text-xs text-muted-foreground">
        {months.length} {months.length === 1 ? "mês" : "meses"}
      </span>
      <Button variant="ghost" size="sm" onClick={addMonth} disabled={months.length >= 6}>
        +
      </Button>
    </div>
  );
}

export function CostDetailTable() {
  const { grouped, months, setMonths, getBlockTotals } = useCostLines();

  const categories = Object.keys(grouped);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="h-4 w-4 text-accent" />
            Detalhamento de Custos e Despesas
          </CardTitle>
          <div className="flex items-center gap-2">
            <MonthSelector months={months} setMonths={setMonths} />
            <AddLineDialog />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border mb-1">
          <div className="flex-1 text-xs font-semibold text-muted-foreground">
            Categoria / Subcategoria
          </div>
          {months.map((m) => (
            <div
              key={m}
              className="min-w-[100px] text-right text-xs font-semibold text-muted-foreground"
            >
              {getMonthLabel(m)}
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="space-y-2">
          {categories.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              lines={grouped[cat]}
              months={months}
            />
          ))}
        </div>

        {/* Block Totals */}
        <div className="mt-4 pt-3 border-t border-border space-y-1">
          <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
            Totais por Bloco
          </div>
          {months.length > 0 &&
            (Object.keys(BLOCK_LABELS) as CostBlock[]).map((block) => {
              const totals = months.map((m) => getBlockTotals(m)[block]);
              const hasAny = totals.some((t) => t > 0);
              if (!hasAny) return null;
              return (
                <div key={block} className="flex items-center gap-2 px-3 py-1">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {block}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {BLOCK_LABELS[block]}
                    </span>
                  </div>
                  {totals.map((total, i) => (
                    <span
                      key={months[i]}
                      className="min-w-[100px] text-right text-xs font-display font-semibold text-foreground"
                    >
                      {formatCurrency(total)}
                    </span>
                  ))}
                </div>
              );
            })}

          {/* Grand Total */}
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-md mt-2">
            <div className="flex-1 text-xs font-bold text-foreground">
              TOTAL GERAL
            </div>
            {months.map((m) => {
              const bt = getBlockTotals(m);
              const grand = Object.values(bt).reduce((s, v) => s + v, 0);
              return (
                <span
                  key={m}
                  className="min-w-[100px] text-right text-sm font-display font-bold text-foreground"
                >
                  {formatCurrency(grand)}
                </span>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
