import { useState, useMemo } from "react";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useProducts, calculateProductMetrics } from "@/contexts/ProductContext";
import {
  Product,
  ProductCategory,
  CATEGORY_LABELS,
  STATUS_LABELS,
  BILLING_LABELS,
} from "@/types/products";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Package,
  BarChart3,
  DollarSign,
  Trophy,
  Plus,
  Eye,
  Pencil,
  Copy,
  Users,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const HEALTH_CONFIG = {
  excellent: { color: "bg-success/15 text-success border-success/30", label: "Excelente", dot: "bg-success" },
  good: { color: "bg-accent/15 text-accent border-accent/30", label: "Boa", dot: "bg-accent" },
  warning: { color: "bg-warning/15 text-warning border-warning/30", label: "Atenção", dot: "bg-warning" },
  critical: { color: "bg-destructive/15 text-destructive border-destructive/30", label: "Crítica", dot: "bg-destructive" },
};

const CATEGORY_ORDER: ProductCategory[] = [
  "plan_base",
  "addon_technology",
  "service_support",
  "service_onetime",
];

function ProductDetailDialog({ product }: { product: Product }) {
  const metrics = calculateProductMetrics(product);
  const health = HEALTH_CONFIG[metrics.health];
  const totalCosts = product.cogs + product.laborCost + product.supportCost + product.price * (product.salesCommission / 100);

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display flex items-center gap-3">
          <div className={cn("h-3 w-3 rounded-full", health.dot)} />
          {product.name}
          <Badge className={cn("text-[10px] ml-2", health.color)}>{health.label}</Badge>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        <section>
          <SectionLabel>Informações Básicas</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <DetailRow label="Categoria" value={CATEGORY_LABELS[product.category]} />
            <DetailRow label="Status" value={STATUS_LABELS[product.status]} />
            <DetailRow label="Tipo" value={product.type === "recurring" ? "Recorrente" : "Único"} />
            <DetailRow label="Ciclo de Cobrança" value={BILLING_LABELS[product.billingCycle]} />
            {product.description && <div className="col-span-2"><DetailRow label="Descrição" value={product.description} /></div>}
          </div>
        </section>

        <section>
          <SectionLabel>Precificação & Custos</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <DetailRow label="Preço de Venda" value={`${formatCurrency(product.price)}${product.type === "recurring" ? "/mês" : ""}`} />
            <DetailRow label="COGS (Custo Variável)" value={formatCurrency(product.cogs)} />
            <DetailRow label="Custo de Mão de Obra" value={formatCurrency(product.laborCost)} />
            <DetailRow label="Custo de Suporte" value={formatCurrency(product.supportCost)} />
            <DetailRow label="Comissão de Vendas" value={`${product.salesCommission}%`} />
            <DetailRow label="Custo Total" value={formatCurrency(totalCosts)} />
          </div>
        </section>

        <section>
          <SectionLabel>Rentabilidade</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-secondary/50 p-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Margem de Contribuição</p>
              <p className="font-display text-lg font-bold text-card-foreground">{formatCurrency(metrics.contributionMargin)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Margem %</p>
              <p className={cn("font-display text-lg font-bold", metrics.contributionMarginPercent >= 50 ? "text-success" : metrics.contributionMarginPercent >= 30 ? "text-warning" : "text-destructive")}>
                {formatPercent(metrics.contributionMarginPercent)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saúde</p>
              <p className={cn("font-display text-lg font-bold", health.color)}>{health.label}</p>
            </div>
          </div>
        </section>

        <section>
          <SectionLabel>Dados Comerciais</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <DetailRow label="Clientes Ativos" value={String(product.activeCustomers)} />
            <DetailRow label={product.type === "recurring" ? "MRR" : "Receita Total"} value={formatCurrency(product.type === "recurring" ? product.mrr : product.totalRevenue)} />
            {product.churnRate !== undefined && <DetailRow label="Churn Rate" value={formatPercent(product.churnRate)} />}
          </div>
        </section>

        {product.includes && (
          <section>
            <SectionLabel>O Que Está Incluso</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <DetailRow label="Dispositivos Web" value={String(product.includes.devicesWeb)} />
              <DetailRow label="Dispositivos Meta" value={String(product.includes.devicesMeta)} />
              <DetailRow label="Atendentes" value={String(product.includes.attendants)} />
              <DetailRow label="Agentes I.A." value={String(product.includes.aiAgents)} />
            </div>
          </section>
        )}

        {product.monthlyHours && (
          <section>
            <SectionLabel>Horas de Serviço</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <DetailRow label="Horas Mensais" value={`${product.monthlyHours}h`} />
              <DetailRow label="Horas Semanais" value={`${product.weeklyHours}h`} />
              <DetailRow label="Custo por Hora" value={formatCurrency(product.hourlyRate || 0)} />
            </div>
          </section>
        )}

        {product.deliveryTime && (
          <section><DetailRow label="Prazo de Entrega" value={product.deliveryTime} /></section>
        )}

        <section>
          <SectionLabel>Registro</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <DetailRow label="Criado em" value={new Date(product.createdAt).toLocaleDateString("pt-BR")} />
            <DetailRow label="Atualizado em" value={new Date(product.updatedAt).toLocaleDateString("pt-BR")} />
          </div>
        </section>
      </div>
    </DialogContent>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-card-foreground">{value}</span>
    </div>
  );
}

function ProductCard({ product, onEdit }: { product: Product; onEdit: (p: Product) => void }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const metrics = calculateProductMetrics(product);
  const health = HEALTH_CONFIG[metrics.health];

  return (
    <Card className="group transition-all duration-300 hover:-translate-y-1 hover:hover:hover:border-primary/30">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("h-2.5 w-2.5 rounded-full", health.dot)} />
            <div>
              <h4 className="font-display font-bold text-card-foreground">{product.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] px-2 py-0 border-primary/30 text-primary">
                  {CATEGORY_LABELS[product.category]}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-2 py-0 border-accent/30 text-accent">
                  {product.type === "recurring" ? `Recorrente ${BILLING_LABELS[product.billingCycle]}` : "Único"}
                </Badge>
              </div>
            </div>
          </div>
          <Badge className={cn("text-[10px]", health.color)}>{health.label}</Badge>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3 bg-secondary/50 p-2 sm:p-3 mb-4">
          <MetricItem label={product.type === "recurring" ? "Preço/mês" : "Preço"} value={formatCurrency(product.price)} />
          <MetricItem label="COGS" value={formatCurrency(product.cogs + product.laborCost + product.supportCost)} />
          <MetricItem
            label="Margem"
            value={formatPercent(metrics.contributionMarginPercent)}
            className={metrics.contributionMarginPercent >= 50 ? "text-success" : metrics.contributionMarginPercent >= 30 ? "text-warning" : "text-destructive"}
          />
          <MetricItem label="Clientes" value={String(product.activeCustomers)} />
          <MetricItem
            label={product.type === "recurring" ? "MRR" : "Receita Total"}
            value={formatCurrency(product.type === "recurring" ? product.mrr : product.totalRevenue)}
          />
        </div>

        {product.includes && (
          <div className="text-xs text-muted-foreground mb-3 bg-accent/5 px-3 py-2">
            <strong>Inclui:</strong> {product.includes.devicesWeb} Web + {product.includes.devicesMeta} Meta
            {product.includes.attendants > 0 && ` + ${product.includes.attendants} Atendente${product.includes.attendants > 1 ? "s" : ""}`}
            {product.includes.aiAgents > 0 && ` + ${product.includes.aiAgents} I.A.`}
          </div>
        )}

        {product.monthlyHours && (
          <div className="text-xs text-muted-foreground mb-3 bg-accent/5 px-3 py-2 flex items-center gap-2">
            <Clock className="h-3 w-3" />
            {product.monthlyHours}h/mês ({product.weeklyHours}h/semana) — {formatCurrency(product.hourlyRate || 0)}/hora
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Eye className="h-3 w-3" /> Detalhes
              </Button>
            </DialogTrigger>
            <ProductDetailDialog product={product} />
          </Dialog>
          <PermissionGate module="produtos" action="edit">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => onEdit(product)}>
              <Pencil className="h-3 w-3" /> Editar
            </Button>
          </PermissionGate>
          <PermissionGate module="produtos" action="create">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Copy className="h-3 w-3" /> Duplicar
            </Button>
          </PermissionGate>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{label}</span>
      <span className={cn("text-xs sm:text-sm font-bold text-card-foreground whitespace-nowrap", className)}>{value}</span>
    </div>
  );
}

function NewProductModal() {
  const { addProduct } = useProducts();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "" as ProductCategory | "",
    type: "recurring" as "recurring" | "one_time",
    status: "active" as "active" | "inactive" | "planning",
    price: 0,
    billingCycle: "monthly" as "monthly" | "quarterly" | "annual" | "one_time",
    description: "",
    cogs: 0,
    laborCost: 0,
    supportCost: 0,
    salesCommission: 0,
    monthlyHours: 0,
    weeklyHours: 0,
    deliveryTime: "",
    devicesWeb: 0,
    devicesMeta: 0,
    attendants: 0,
    aiAgents: 0,
    activeCustomers: 0,
    mrr: 0,
    totalRevenue: 0,
  });

  const totalCosts = form.cogs + form.laborCost + form.supportCost + form.price * (form.salesCommission / 100);
  const margin = form.price - totalCosts;
  const marginPercent = form.price > 0 ? (margin / form.price) * 100 : 0;
  const hourlyRate = form.monthlyHours > 0 ? form.price / form.monthlyHours : 0;

  let healthLabel = "Calculando...";
  let healthClass = "text-muted-foreground";
  if (form.price > 0) {
    if (marginPercent >= 70) { healthLabel = "🟢 Excelente"; healthClass = "text-success"; }
    else if (marginPercent >= 50) { healthLabel = "🔵 Boa"; healthClass = "text-accent"; }
    else if (marginPercent >= 30) { healthLabel = "🟠 Atenção"; healthClass = "text-warning"; }
    else { healthLabel = "🔴 Crítica"; healthClass = "text-destructive"; }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    if (form.price <= 0) {
      toast.error("O preço deve ser maior que zero");
      return;
    }

    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      name: form.name,
      category: form.category as ProductCategory,
      type: form.type,
      status: form.status,
      price: form.price,
      billingCycle: form.billingCycle,
      description: form.description,
      cogs: form.cogs,
      laborCost: form.laborCost,
      supportCost: form.supportCost,
      salesCommission: form.salesCommission,
      activeCustomers: form.activeCustomers,
      mrr: form.mrr,
      totalRevenue: form.totalRevenue,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(form.category === "plan_base" && {
        includes: {
          devicesWeb: form.devicesWeb,
          devicesMeta: form.devicesMeta,
          attendants: form.attendants,
          aiAgents: form.aiAgents,
        },
      }),
      ...(form.category === "service_support" && {
        monthlyHours: form.monthlyHours,
        weeklyHours: form.weeklyHours,
        hourlyRate,
      }),
      ...(form.type === "one_time" && {
        deliveryTime: form.deliveryTime,
      }),
    };

    addProduct(newProduct);
    toast.success("Produto salvo com sucesso!");
    setOpen(false);
    setForm({
      name: "", category: "", type: "recurring", status: "active", price: 0,
      billingCycle: "monthly", description: "", cogs: 0, laborCost: 0, supportCost: 0,
      salesCommission: 0, monthlyHours: 0, weeklyHours: 0, deliveryTime: "",
      devicesWeb: 0, devicesMeta: 0, attendants: 0, aiAgents: 0,
      activeCustomers: 0, mrr: 0, totalRevenue: 0,
    });
  };

  const setField = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Novo Produto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Novo Produto/Serviço</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <section>
            <SectionLabel>Informações Básicas</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nome do Produto *</Label>
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} required />
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setField("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan_base">Plano Base</SelectItem>
                    <SelectItem value="addon_technology">Add-on Tecnologia</SelectItem>
                    <SelectItem value="service_support">Facilite Whatsflow</SelectItem>
                    <SelectItem value="service_onetime">Serviço Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="planning">Em Planejamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} />
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section>
            <SectionLabel>Precificação</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Preço de Venda (R$) *</Label>
                <Input type="number" min={0} step={0.01} value={form.price || ""} onChange={(e) => setField("price", Number(e.target.value))} required />
              </div>
              <div>
                <Label>Ciclo de Cobrança</Label>
                <Select value={form.billingCycle} onValueChange={(v) => setField("billingCycle", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                    <SelectItem value="one_time">Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Facilite fields */}
          {form.category === "service_support" && (
            <section>
              <SectionLabel>Horas de Serviço</SectionLabel>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Horas Mensais</Label>
                  <Input type="number" min={0} value={form.monthlyHours || ""} onChange={(e) => setField("monthlyHours", Number(e.target.value))} />
                </div>
                <div>
                  <Label>Horas Semanais</Label>
                  <Input type="number" min={0} step={0.5} value={form.weeklyHours || ""} onChange={(e) => setField("weeklyHours", Number(e.target.value))} />
                </div>
                <div>
                  <Label>Custo por Hora (calculado)</Label>
                  <Input disabled value={form.monthlyHours > 0 ? `${formatCurrency(hourlyRate)}/hora` : "—"} />
                </div>
              </div>
            </section>
          )}

          {/* Plan base includes */}
          {form.category === "plan_base" && (
            <section>
              <SectionLabel>O Que Está Incluso</SectionLabel>
              <div className="grid gap-4 sm:grid-cols-4">
                <div><Label>Dispositivos Web</Label><Input type="number" min={0} value={form.devicesWeb || ""} onChange={(e) => setField("devicesWeb", Number(e.target.value))} /></div>
                <div><Label>Dispositivos Meta</Label><Input type="number" min={0} value={form.devicesMeta || ""} onChange={(e) => setField("devicesMeta", Number(e.target.value))} /></div>
                <div><Label>Atendentes</Label><Input type="number" min={0} value={form.attendants || ""} onChange={(e) => setField("attendants", Number(e.target.value))} /></div>
                <div><Label>Agentes I.A.</Label><Input type="number" min={0} value={form.aiAgents || ""} onChange={(e) => setField("aiAgents", Number(e.target.value))} /></div>
              </div>
            </section>
          )}

          {/* One-time delivery */}
          {form.type === "one_time" && (
            <section>
              <div><Label>Prazo de Entrega</Label><Input value={form.deliveryTime} onChange={(e) => setField("deliveryTime", e.target.value)} placeholder="Ex: 15 dias úteis" /></div>
            </section>
          )}

          {/* Cost structure */}
          <section>
            <SectionLabel>Estrutura de Custos</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>COGS - Custo Variável (R$)</Label><Input type="number" min={0} step={0.01} value={form.cogs || ""} onChange={(e) => setField("cogs", Number(e.target.value))} /></div>
              <div><Label>Custo de Mão de Obra (R$)</Label><Input type="number" min={0} step={0.01} value={form.laborCost || ""} onChange={(e) => setField("laborCost", Number(e.target.value))} /></div>
              <div><Label>Custo de Suporte (R$)</Label><Input type="number" min={0} step={0.01} value={form.supportCost || ""} onChange={(e) => setField("supportCost", Number(e.target.value))} /></div>
              <div><Label>Comissão de Vendas (%)</Label><Input type="number" min={0} max={100} step={0.1} value={form.salesCommission || ""} onChange={(e) => setField("salesCommission", Number(e.target.value))} /></div>
            </div>
          </section>

          {/* Business data */}
          <section>
            <SectionLabel>Dados Comerciais</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><Label>Clientes Ativos</Label><Input type="number" min={0} value={form.activeCustomers || ""} onChange={(e) => setField("activeCustomers", Number(e.target.value))} /></div>
              <div><Label>MRR (R$)</Label><Input type="number" min={0} step={0.01} value={form.mrr || ""} onChange={(e) => setField("mrr", Number(e.target.value))} /></div>
              <div><Label>Receita Total (R$)</Label><Input type="number" min={0} step={0.01} value={form.totalRevenue || ""} onChange={(e) => setField("totalRevenue", Number(e.target.value))} /></div>
            </div>
          </section>

          {/* Real-time preview */}
          <div className="border border-border bg-secondary/50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Preview de Rentabilidade
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Margem de Contribuição</p>
                <p className="font-display text-xl font-bold text-card-foreground">{formatCurrency(margin)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margem %</p>
                <p className="font-display text-xl font-bold text-card-foreground">{formatPercent(marginPercent)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={cn("font-display text-xl font-bold", healthClass)}>{healthLabel}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit">💾 Salvar Produto</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditProductModal({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (updates: Partial<Product>) => void }) {
  const [form, setForm] = useState({
    name: product.name,
    category: product.category as string,
    type: product.type,
    status: product.status,
    price: product.price,
    billingCycle: product.billingCycle,
    description: product.description || "",
    cogs: product.cogs,
    laborCost: product.laborCost,
    supportCost: product.supportCost,
    salesCommission: product.salesCommission,
    monthlyHours: product.monthlyHours || 0,
    weeklyHours: product.weeklyHours || 0,
    deliveryTime: product.deliveryTime || "",
    devicesWeb: product.includes?.devicesWeb || 0,
    devicesMeta: product.includes?.devicesMeta || 0,
    attendants: product.includes?.attendants || 0,
    aiAgents: product.includes?.aiAgents || 0,
    activeCustomers: product.activeCustomers,
    mrr: product.mrr,
    totalRevenue: product.totalRevenue,
  });

  const totalCosts = form.cogs + form.laborCost + form.supportCost + form.price * (form.salesCommission / 100);
  const margin = form.price - totalCosts;
  const marginPercent = form.price > 0 ? (margin / form.price) * 100 : 0;

  const setField = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name,
      category: form.category as ProductCategory,
      type: form.type as "recurring" | "one_time",
      status: form.status as "active" | "inactive" | "planning",
      price: form.price,
      billingCycle: form.billingCycle as any,
      description: form.description,
      cogs: form.cogs,
      laborCost: form.laborCost,
      supportCost: form.supportCost,
      salesCommission: form.salesCommission,
      activeCustomers: form.activeCustomers,
      mrr: form.mrr,
      totalRevenue: form.totalRevenue,
      ...(form.category === "plan_base" && {
        includes: { devicesWeb: form.devicesWeb, devicesMeta: form.devicesMeta, attendants: form.attendants, aiAgents: form.aiAgents },
      }),
      ...(form.category === "service_support" && { monthlyHours: form.monthlyHours, weeklyHours: form.weeklyHours }),
      ...(form.type === "one_time" && { deliveryTime: form.deliveryTime }),
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Editar: {product.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <section>
            <SectionLabel>Informacoes Basicas</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setField("name", e.target.value)} required /></div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setField("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan_base">Plano Base</SelectItem>
                    <SelectItem value="addon_technology">Add-on Tecnologia</SelectItem>
                    <SelectItem value="service_support">Facilite Whatsflow</SelectItem>
                    <SelectItem value="service_onetime">Servico Unico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="planning">Em Planejamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Descricao</Label><Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} /></div>
            </div>
          </section>
          <section>
            <SectionLabel>Precificacao</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Preco (R$)</Label><Input type="number" min={0} step={0.01} value={form.price || ""} onChange={(e) => setField("price", Number(e.target.value))} /></div>
              <div>
                <Label>Ciclo</Label>
                <Select value={form.billingCycle} onValueChange={(v) => setField("billingCycle", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                    <SelectItem value="one_time">Unico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
          {form.category === "plan_base" && (
            <section>
              <SectionLabel>Incluso</SectionLabel>
              <div className="grid gap-4 sm:grid-cols-4">
                <div><Label>Disp. Web</Label><Input type="number" min={0} value={form.devicesWeb || ""} onChange={(e) => setField("devicesWeb", Number(e.target.value))} /></div>
                <div><Label>Disp. Meta</Label><Input type="number" min={0} value={form.devicesMeta || ""} onChange={(e) => setField("devicesMeta", Number(e.target.value))} /></div>
                <div><Label>Atendentes</Label><Input type="number" min={0} value={form.attendants || ""} onChange={(e) => setField("attendants", Number(e.target.value))} /></div>
                <div><Label>Agentes I.A.</Label><Input type="number" min={0} value={form.aiAgents || ""} onChange={(e) => setField("aiAgents", Number(e.target.value))} /></div>
              </div>
            </section>
          )}
          <section>
            <SectionLabel>Custos</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>COGS (R$)</Label><Input type="number" min={0} step={0.01} value={form.cogs || ""} onChange={(e) => setField("cogs", Number(e.target.value))} /></div>
              <div><Label>Mao de Obra (R$)</Label><Input type="number" min={0} step={0.01} value={form.laborCost || ""} onChange={(e) => setField("laborCost", Number(e.target.value))} /></div>
              <div><Label>Suporte (R$)</Label><Input type="number" min={0} step={0.01} value={form.supportCost || ""} onChange={(e) => setField("supportCost", Number(e.target.value))} /></div>
              <div><Label>Comissao (%)</Label><Input type="number" min={0} max={100} step={0.1} value={form.salesCommission || ""} onChange={(e) => setField("salesCommission", Number(e.target.value))} /></div>
            </div>
          </section>
          <section>
            <SectionLabel>Dados Comerciais</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><Label>Clientes Ativos</Label><Input type="number" min={0} value={form.activeCustomers || ""} onChange={(e) => setField("activeCustomers", Number(e.target.value))} /></div>
              <div><Label>MRR (R$)</Label><Input type="number" min={0} step={0.01} value={form.mrr || ""} onChange={(e) => setField("mrr", Number(e.target.value))} /></div>
              <div><Label>Receita Total (R$)</Label><Input type="number" min={0} step={0.01} value={form.totalRevenue || ""} onChange={(e) => setField("totalRevenue", Number(e.target.value))} /></div>
            </div>
          </section>
          <div className="border border-border bg-secondary/50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Preview</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-muted-foreground">Margem</p><p className="font-bold text-lg">{formatCurrency(margin)} ({formatPercent(marginPercent)})</p></div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar Alteracoes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      <div className="h-1 w-4 rounded-full bg-primary" />
      {children}
    </h3>
  );
}

export default function ProductsPage() {
  const { products, portfolioKPIs, updateProduct } = useProducts();
  const [filterCategory, setFilterCategory] = useState<ProductCategory | "all">("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    if (filterCategory === "all") return products;
    return products.filter((p) => p.category === filterCategory);
  }, [products, filterCategory]);

  const groupedProducts = useMemo(() => {
    const groups: Partial<Record<ProductCategory, Product[]>> = {};
    for (const cat of CATEGORY_ORDER) {
      const items = filteredProducts.filter((p) => p.category === cat);
      if (items.length > 0) groups[cat] = items;
    }
    return groups;
  }, [filteredProducts]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Gestão de Produtos/Serviços</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie produtos, analise rentabilidade e otimize seu mix de vendas
          </p>
        </div>
        <NewProductModal />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total de Produtos"
          value={String(portfolioKPIs.totalProducts)}
          icon={Package}
          accentColor="accent"
          description={`${portfolioKPIs.recurringCount} recorrentes + ${portfolioKPIs.oneTimeCount} únicos`}
          delay={0}
        />
        <KPICard
          title="Margem Média"
          value={formatPercent(portfolioKPIs.avgMargin)}
          icon={BarChart3}
          accentColor={portfolioKPIs.avgMargin >= 60 ? "primary" : "warning"}
          description={portfolioKPIs.avgMargin >= 60 ? "✓ Acima de 60%" : "⚠ Abaixo de 60%"}
          delay={50}
        />
        <KPICard
          title="MRR Total"
          value={formatCurrency(portfolioKPIs.totalMRR)}
          icon={DollarSign}
          accentColor="primary"
          description="Produtos recorrentes"
          delay={100}
        />
        <KPICard
          title="Mais Lucrativo"
          value={portfolioKPIs.mostProfitableProduct ? formatPercent(portfolioKPIs.mostProfitableProduct.margin) : "—"}
          icon={Trophy}
          accentColor="accent"
          description={portfolioKPIs.mostProfitableProduct?.name || "—"}
          delay={150}
        />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-xs font-medium text-muted-foreground">Filtrar:</span>
        {(["all", ...CATEGORY_ORDER] as const).map((cat) => (
          <Button
            key={cat}
            variant={filterCategory === cat ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setFilterCategory(cat)}
          >
            {cat === "all" ? "Todos" : CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

      {/* Product cards grouped by category */}
      {Object.entries(groupedProducts).map(([category, items]) => (
        <section key={category}>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <div className="h-1 w-4 rounded-full bg-primary" />
            {CATEGORY_LABELS[category as ProductCategory]}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {items!.map((product) => (
              <ProductCard key={product.id} product={product} onEdit={setEditingProduct} />
            ))}
          </div>
        </section>
      ))}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(updates) => {
            updateProduct(editingProduct.id, updates);
            setEditingProduct(null);
            toast.success("Produto atualizado!");
          }}
        />
      )}
    </div>
  );
}
