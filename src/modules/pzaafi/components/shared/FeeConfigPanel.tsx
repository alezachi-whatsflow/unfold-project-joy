/**
 * Fee Configuration Panel — 3-layer fee model
 * Used by: Nexus (set gateway + pzaafi fees) and Tenant (set markup)
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Calculator, CreditCard, QrCode, FileText, Percent, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface FeeConfig {
  id?: string;
  organization_id: string;
  tenant_id: string;
  pix_gateway_fee_pct: number;
  pix_pzaafi_fee_pct: number;
  pix_pzaafi_fee_fixed: number;
  card_gateway_fee_pct: number;
  card_gateway_fee_fixed: number;
  card_pzaafi_fee_pct: number;
  card_pzaafi_fee_fixed: number;
  boleto_gateway_fee: number;
  boleto_pzaafi_fee: number;
  tenant_markup_pct: number;
  tenant_markup_fixed: number;
  tenant_markup_enabled: boolean;
  fee_payer: string;
}

const DEFAULT_FEES: Omit<FeeConfig, "organization_id" | "tenant_id"> = {
  pix_gateway_fee_pct: 0.99,
  pix_pzaafi_fee_pct: 0.00,
  pix_pzaafi_fee_fixed: 0.00,
  card_gateway_fee_pct: 2.99,
  card_gateway_fee_fixed: 0.49,
  card_pzaafi_fee_pct: 0.00,
  card_pzaafi_fee_fixed: 0.00,
  boleto_gateway_fee: 1.15,
  boleto_pzaafi_fee: 0.35,
  tenant_markup_pct: 0.00,
  tenant_markup_fixed: 0.00,
  tenant_markup_enabled: false,
  fee_payer: "seller",
};

interface FeeConfigPanelProps {
  organizationId: string;
  tenantId: string;
  isNexus?: boolean; // Nexus can edit gateway + pzaafi fees; tenant can only edit markup
  onClose?: () => void;
}

export function FeeConfigPanel({ organizationId, tenantId, isNexus = false, onClose }: FeeConfigPanelProps) {
  const [fees, setFees] = useState<FeeConfig>({ ...DEFAULT_FEES, organization_id: organizationId, tenant_id: tenantId });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("pzaafi_fee_configs")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (data) setFees(data);
      setLoaded(true);
    })();
  }, [organizationId]);

  const update = <K extends keyof FeeConfig>(key: K, value: FeeConfig[K]) => {
    setFees((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("pzaafi_fee_configs")
        .upsert({
          ...fees,
          organization_id: organizationId,
          tenant_id: tenantId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "organization_id" });
      if (error) throw error;
      toast.success("Taxas salvas!");
      onClose?.();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Preview calculations for R$ 100 product
  const preview = 100;
  const pixTotal = preview * ((fees.pix_gateway_fee_pct + fees.pix_pzaafi_fee_pct) / 100) + fees.pix_pzaafi_fee_fixed;
  const cardTotal = preview * ((fees.card_gateway_fee_pct + fees.card_pzaafi_fee_pct) / 100) + fees.card_gateway_fee_fixed + fees.card_pzaafi_fee_fixed;
  const boletoTotal = fees.boleto_gateway_fee + fees.boleto_pzaafi_fee;
  const markupValue = fees.tenant_markup_enabled ? (preview * (fees.tenant_markup_pct / 100) + fees.tenant_markup_fixed) : 0;

  if (!loaded) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold">Configuracao de Taxas</h3>
      </div>

      {/* PIX */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs flex items-center gap-2"><QrCode className="h-3.5 w-3.5 text-emerald-500" /> PIX</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-[10px]">Gateway (%)</Label>
              <Input type="number" step="0.01" min="0" value={fees.pix_gateway_fee_pct} onChange={(e) => update("pix_gateway_fee_pct", Number(e.target.value))} className="h-8 text-xs" disabled={!isNexus} />
            </div>
            <div>
              <Label className="text-[10px]">Pzaafi (%)</Label>
              <Input type="number" step="0.01" min="0" value={fees.pix_pzaafi_fee_pct} onChange={(e) => update("pix_pzaafi_fee_pct", Number(e.target.value))} className="h-8 text-xs" disabled={!isNexus} />
            </div>
            <div className="flex items-end">
              <Badge variant="outline" className="text-[10px] h-8 flex items-center">
                Total: {(fees.pix_gateway_fee_pct + fees.pix_pzaafi_fee_pct).toFixed(2)}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cartao */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-blue-500" /> Cartao</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-[10px]">Gateway (%)</Label>
              <Input type="number" step="0.01" min="0" value={fees.card_gateway_fee_pct} onChange={(e) => update("card_gateway_fee_pct", Number(e.target.value))} className="h-8 text-xs" disabled={!isNexus} />
            </div>
            <div>
              <Label className="text-[10px]">Gateway (R$)</Label>
              <Input type="number" step="0.01" min="0" value={fees.card_gateway_fee_fixed} onChange={(e) => update("card_gateway_fee_fixed", Number(e.target.value))} className="h-8 text-xs" disabled={!isNexus} />
            </div>
            <div>
              <Label className="text-[10px]">Pzaafi (%)</Label>
              <Input type="number" step="0.01" min="0" value={fees.card_pzaafi_fee_pct} onChange={(e) => update("card_pzaafi_fee_pct", Number(e.target.value))} className="h-8 text-xs" disabled={!isNexus} />
            </div>
            <div className="flex items-end">
              <Badge variant="outline" className="text-[10px] h-8 flex items-center">
                {(fees.card_gateway_fee_pct + fees.card_pzaafi_fee_pct).toFixed(2)}% + R$ {(fees.card_gateway_fee_fixed + fees.card_pzaafi_fee_fixed).toFixed(2)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Boleto */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-amber-500" /> Boleto</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-[10px]">Gateway (R$)</Label>
              <Input type="number" step="0.01" min="0" value={fees.boleto_gateway_fee} onChange={(e) => update("boleto_gateway_fee", Number(e.target.value))} className="h-8 text-xs" disabled={!isNexus} />
            </div>
            <div>
              <Label className="text-[10px]">Pzaafi (R$)</Label>
              <Input type="number" step="0.01" min="0" value={fees.boleto_pzaafi_fee} onChange={(e) => update("boleto_pzaafi_fee", Number(e.target.value))} className="h-8 text-xs" disabled={!isNexus} />
            </div>
            <div className="flex items-end">
              <Badge variant="outline" className="text-[10px] h-8 flex items-center">
                Total: R$ {(fees.boleto_gateway_fee + fees.boleto_pzaafi_fee).toFixed(2)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Markup */}
      <Card className={fees.tenant_markup_enabled ? "border-primary/30" : ""}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-2"><Percent className="h-3.5 w-3.5 text-purple-500" /> Comissao do Checkout</CardTitle>
            <Switch checked={fees.tenant_markup_enabled} onCheckedChange={(v) => update("tenant_markup_enabled", v)} />
          </div>
        </CardHeader>
        {fees.tenant_markup_enabled && (
          <CardContent className="px-4 pb-3 space-y-3">
            <p className="text-[10px] text-muted-foreground">Valor adicional repassado ao comprador. Voce recebe esse valor integralmente.</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px]">Percentual (%)</Label>
                <Input type="number" step="0.01" min="0" value={fees.tenant_markup_pct} onChange={(e) => update("tenant_markup_pct", Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Fixo (R$)</Label>
                <Input type="number" step="0.01" min="0" value={fees.tenant_markup_fixed} onChange={(e) => update("tenant_markup_fixed", Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Quem paga as taxas base?</Label>
                <Select value={fees.fee_payer} onValueChange={(v) => update("fee_payer", v)}>
                  <SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller">Vendedor absorve</SelectItem>
                    <SelectItem value="buyer">Comprador paga tudo</SelectItem>
                    <SelectItem value="split">Dividido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Preview */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-3 px-4">
          <p className="text-[10px] font-semibold text-muted-foreground mb-2">SIMULACAO (produto de R$ 100,00)</p>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="font-semibold flex items-center gap-1"><QrCode className="h-3 w-3 text-emerald-500" /> PIX</p>
              <p className="text-muted-foreground">Taxa: R$ {pixTotal.toFixed(2)}</p>
              {markupValue > 0 && <p className="text-purple-500">+Markup: R$ {markupValue.toFixed(2)}</p>}
              <p className="font-bold">Total: R$ {(preview + (fees.fee_payer === "buyer" ? pixTotal : 0) + markupValue).toFixed(2)}</p>
            </div>
            <div>
              <p className="font-semibold flex items-center gap-1"><CreditCard className="h-3 w-3 text-blue-500" /> Cartao</p>
              <p className="text-muted-foreground">Taxa: R$ {cardTotal.toFixed(2)}</p>
              {markupValue > 0 && <p className="text-purple-500">+Markup: R$ {markupValue.toFixed(2)}</p>}
              <p className="font-bold">Total: R$ {(preview + (fees.fee_payer === "buyer" ? cardTotal : 0) + markupValue).toFixed(2)}</p>
            </div>
            <div>
              <p className="font-semibold flex items-center gap-1"><FileText className="h-3 w-3 text-amber-500" /> Boleto</p>
              <p className="text-muted-foreground">Taxa: R$ {boletoTotal.toFixed(2)}</p>
              {markupValue > 0 && <p className="text-purple-500">+Markup: R$ {markupValue.toFixed(2)}</p>}
              <p className="font-bold">Total: R$ {(preview + (fees.fee_payer === "buyer" ? boletoTotal : 0) + markupValue).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Taxas
        </Button>
      </div>
    </div>
  );
}
