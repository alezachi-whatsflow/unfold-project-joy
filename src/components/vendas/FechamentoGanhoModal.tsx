import { useState } from "react";
import { useNegocios } from "@/hooks/useNegocios";
import { useTenantId } from "@/hooks/useTenantId";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Link2, Trophy } from "lucide-react";
import { FORMAS_PAGAMENTO, type Negocio } from "@/types/vendas";

interface Props {
  negocio: Negocio;
  onClose: () => void;
}

function generatePaymentLink(negocio: Negocio): string {
  return `${window.location.origin}/checkout/${negocio.id}`;
}

export default function FechamentoGanhoModal({ negocio, onClose }: Props) {
  const tenantId = useTenantId();
  const { changeStatus, updateNegocio, addHistoricoItem } = useNegocios(tenantId);
  const [step, setStep] = useState<'confirm' | 'cobranca' | 'nf' | 'link'>('confirm');
  const [saving, setSaving] = useState(false);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const paymentLink = generatePaymentLink(negocio);

  const handleCloseGanho = async () => {
    setSaving(true);
    try {
      await changeStatus(negocio, 'fechado_ganho');
      toast.success("Negócio fechado como ganho!");

      if (negocio.gerar_cobranca) {
        setStep('cobranca');
      } else if (negocio.gerar_nf) {
        setStep('nf');
      } else {
        setStep('link');
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao fechar negócio.");
    } finally {
      setSaving(false);
    }
  };

  const handleGerarCobranca = async () => {
    setSaving(true);
    try {
      const cobrancaId = `COB-${Date.now()}`;
      await updateNegocio(negocio.id, { cobranca_id: cobrancaId } as any);
      await addHistoricoItem(negocio, { tipo: 'cobranca', descricao: `Cobrança gerada: ${cobrancaId}` });
      toast.success("Cobrança gerada e vinculada ao negócio!");

      if (negocio.gerar_nf) {
        setStep('nf');
      } else {
        setStep('link');
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar cobrança.");
    } finally {
      setSaving(false);
    }
  };

  const handleEmitirNF = async () => {
    setSaving(true);
    try {
      const nfId = `NF-${Date.now()}`;
      await updateNegocio(negocio.id, { nf_emitida_id: nfId } as any);
      await addHistoricoItem(negocio, { tipo: 'nf', descricao: `NF emitida: ${nfId}` });
      toast.success("Nota Fiscal emitida e vinculada ao negócio!");
      setStep('link');
    } catch (err: any) {
      toast.error(err?.message || "Erro ao emitir NF.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    toast.success("Link copiado para a área de transferência!");
  };

  // Step: Payment Link
  if (step === 'link') {
    return (
      <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-500" /> Negócio Fechado!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-4 border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-500">Link de Pagamento / Contrato</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Envie este link para o cliente. Ele poderá preencher seus dados, revisar o contrato e confirmar o pagamento.
              </p>
              <div className="flex gap-2">
                <Input value={paymentLink} readOnly className="text-xs h-9 bg-background" />
                <Button size="sm" className="shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCopyLink}>
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'cobranca' && negocio.gerar_cobranca) {
    return (
      <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Cobrança?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Deseja gerar a cobrança automaticamente para este negócio?</p>
            <div className="border border-border/40 p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><span className="text-foreground">{negocio.cliente_nome || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor:</span><span className="font-bold text-foreground">{fmt(negocio.valor_liquido)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Forma:</span><span className="text-foreground">{FORMAS_PAGAMENTO.find(f => f.value === negocio.forma_pagamento)?.label || negocio.forma_pagamento}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Condição:</span><span className="text-foreground">{negocio.condicao_pagamento}</span></div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { if (negocio.gerar_nf) setStep('nf'); else setStep('link'); }}>Gerar depois</Button>
              <Button variant="outline" size="sm" onClick={() => setStep('link')}>Não gerar</Button>
              <Button size="sm" onClick={handleGerarCobranca} disabled={saving}>{saving ? "Gerando..." : "Gerar Cobrança"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'nf' && negocio.gerar_nf) {
    return (
      <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Emitir Nota Fiscal?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Deseja emitir a Nota Fiscal automaticamente?</p>
            <div className="border border-border/40 p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><span className="text-foreground">{negocio.cliente_nome || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor:</span><span className="font-bold text-foreground">{fmt(negocio.valor_liquido)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Produtos:</span><span className="text-foreground">{negocio.produtos.length} item(s)</span></div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setStep('link')}>Emitir depois</Button>
              <Button variant="outline" size="sm" onClick={() => setStep('link')}>Não emitir</Button>
              <Button size="sm" onClick={handleEmitirNF} disabled={saving}>{saving ? "Emitindo..." : "Emitir NF"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Initial confirmation
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-500" /> Fechar como Ganho?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">Confirma o fechamento do negócio "{negocio.titulo}" como ganho?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCloseGanho} disabled={saving}>{saving ? "Fechando..." : "Confirmar Ganho"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
