import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useFinancial } from "@/contexts/FinancialContext";
import { useCostLines } from "@/contexts/CostLinesContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMonthFullLabel } from "@/lib/calculations";
import { toast } from "sonner";
import { Save, DollarSign, TrendingDown, Users, Wallet, RefreshCw } from "lucide-react";

interface FormData {
  mrr: number;
  newMRR: number;
  expansionMRR: number;
  churnedMRR: number;
  otherRevenue: number;
  fixedCosts: number;
  variableCosts: number;
  infrastructure: number;
  marketing: number;
  taxes: number;
  payroll: number;
  benefits: number;
  contractors: number;
  totalCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  cashBalance: number;
}

const defaultValues: FormData = {
  mrr: 0,
  newMRR: 0,
  expansionMRR: 0,
  churnedMRR: 0,
  otherRevenue: 0,
  fixedCosts: 0,
  variableCosts: 0,
  infrastructure: 0,
  marketing: 0,
  taxes: 0,
  payroll: 0,
  benefits: 0,
  contractors: 0,
  totalCustomers: 0,
  newCustomers: 0,
  churnedCustomers: 0,
  cashBalance: 0,
};

function InputField({
  label,
  name,
  register,
}: {
  label: string;
  name: keyof FormData;
  register: any;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={name}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </Label>
      <Input
        id={name}
        type="number"
        step="1"
        min="0"
        className="h-9 bg-secondary border-border text-foreground font-display text-sm"
        {...register(name, { valueAsNumber: true })}
      />
    </div>
  );
}

export function MonthlyInputForm() {
  const { entries, addEntry, selectedMonth, setSelectedMonth } =
    useFinancial();
  const { getBlockTotals } = useCostLines();

  const { register, handleSubmit, reset, setValue, getValues } = useForm<FormData>({
    defaultValues,
  });

  // Check if cost lines have data for the selected month
  const blockTotals = useMemo(() => getBlockTotals(selectedMonth), [getBlockTotals, selectedMonth]);
  const hasDetailData = useMemo(
    () => Object.values(blockTotals).some((v) => v > 0),
    [blockTotals]
  );

  useEffect(() => {
    const entry = entries.find((e) => e.month === selectedMonth);
    if (entry) {
      reset({
        mrr: entry.revenue.mrr,
        newMRR: entry.revenue.newMRR,
        expansionMRR: entry.revenue.expansionMRR,
        churnedMRR: entry.revenue.churnedMRR,
        otherRevenue: entry.revenue.otherRevenue,
        fixedCosts: entry.costs.fixedCosts,
        variableCosts: entry.costs.variableCosts,
        infrastructure: entry.costs.infrastructure,
        marketing: entry.costs.marketing,
        taxes: entry.costs.taxes,
        payroll: entry.personnel.payroll,
        benefits: entry.personnel.benefits,
        contractors: entry.personnel.contractors,
        totalCustomers: entry.customers.totalCustomers,
        newCustomers: entry.customers.newCustomers,
        churnedCustomers: entry.customers.churnedCustomers,
        cashBalance: entry.cashBalance,
      });
    } else {
      reset(defaultValues);
    }
  }, [selectedMonth, entries, reset]);

  const syncFromDetail = () => {
    const totals = getBlockTotals(selectedMonth);
    setValue("variableCosts", totals["CSP"], { shouldDirty: true });
    setValue("marketing", totals["MKT"], { shouldDirty: true });
    setValue("payroll", totals["SAL"], { shouldDirty: true });
    setValue("fixedCosts", totals["G&A"], { shouldDirty: true });
    setValue("infrastructure", totals["FIN"], { shouldDirty: true });
    setValue("taxes", totals["TAX"], { shouldDirty: true });
    // REV- subtracts from otherRevenue
    const currentOther = getValues("otherRevenue");
    if (totals["REV-"] > 0) {
      setValue("otherRevenue", currentOther - totals["REV-"], { shouldDirty: true });
    }
    toast.success("Valores sincronizados do detalhamento!");
  };

  const onSubmit = (data: FormData) => {
    const entry = {
      id: Math.random().toString(36).substring(2, 11),
      month: selectedMonth,
      revenue: {
        mrr: data.mrr,
        newMRR: data.newMRR,
        expansionMRR: data.expansionMRR,
        churnedMRR: data.churnedMRR,
        otherRevenue: data.otherRevenue,
      },
      costs: {
        fixedCosts: data.fixedCosts,
        variableCosts: data.variableCosts,
        infrastructure: data.infrastructure,
        marketing: data.marketing,
        taxes: data.taxes,
      },
      personnel: {
        payroll: data.payroll,
        benefits: data.benefits,
        contractors: data.contractors,
      },
      customers: {
        totalCustomers: data.totalCustomers,
        newCustomers: data.newCustomers,
        churnedCustomers: data.churnedCustomers,
      },
      cashBalance: data.cashBalance,
    };
    addEntry(entry);
    toast.success(
      `Dados de ${getMonthFullLabel(selectedMonth)} salvos com sucesso!`
    );
  };

  // Generate month options
  const monthOptions: string[] = [];
  for (let y = 2024; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      monthOptions.push(`${y}-${m.toString().padStart(2, "0")}`);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Mês de Referência
          </Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[220px] bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {getMonthFullLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-success" />
              Receita
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InputField label="MRR" name="mrr" register={register} />
            <InputField label="Novo MRR" name="newMRR" register={register} />
            <InputField
              label="Expansão MRR"
              name="expansionMRR"
              register={register}
            />
            <InputField
              label="Churn MRR"
              name="churnedMRR"
              register={register}
            />
            <InputField
              label="Outras Receitas"
              name="otherRevenue"
              register={register}
            />
          </CardContent>
        </Card>

        {/* Costs */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Custos e Despesas
              </CardTitle>
              {hasDetailData && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={syncFromDetail}
                >
                  <RefreshCw className="h-3 w-3" />
                  Sincronizar do Detalhamento
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Custos Fixos"
              name="fixedCosts"
              register={register}
            />
            <InputField
              label="Custos Variáveis"
              name="variableCosts"
              register={register}
            />
            <InputField
              label="Infraestrutura"
              name="infrastructure"
              register={register}
            />
            <InputField
              label="Marketing"
              name="marketing"
              register={register}
            />
            <InputField label="Impostos" name="taxes" register={register} />
          </CardContent>
        </Card>

        {/* Personnel */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-accent" />
              Pessoal
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Folha de Pagamento"
              name="payroll"
              register={register}
            />
            <InputField
              label="Benefícios"
              name="benefits"
              register={register}
            />
            <InputField
              label="Terceirizados"
              name="contractors"
              register={register}
            />
          </CardContent>
        </Card>

        {/* Customers & Cash */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-warning" />
              Clientes e Caixa
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Total de Clientes"
              name="totalCustomers"
              register={register}
            />
            <InputField
              label="Novos Clientes"
              name="newCustomers"
              register={register}
            />
            <InputField
              label="Clientes Churned"
              name="churnedCustomers"
              register={register}
            />
            <InputField
              label="Saldo em Caixa"
              name="cashBalance"
              register={register}
            />
          </CardContent>
        </Card>
      </div>

      <Button type="submit" className="gap-2">
        <Save className="h-4 w-4" />
        Salvar Dados
      </Button>
    </form>
  );
}
