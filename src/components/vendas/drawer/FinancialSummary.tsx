import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Trophy, X, Link2, Copy, ClipboardList } from "lucide-react";
import { FORMAS_PAGAMENTO, NEGOCIO_ORIGEM_LABELS, type Negocio } from "@/types/vendas";
import { generatePaymentLink } from "../notesUtils";
import { toast } from "sonner";

interface FinancialSummaryProps {
  negocio: Negocio;
  isActive: boolean;
  isGanho: boolean;
  icpScore: number | null | undefined;
  icpLabel: string | null | undefined;
  icpAction: string | null | undefined;
  hasQuestionnaire: boolean;
  onGanhoClick: () => void;
  onPerdaClick: () => void;
  onQualifierClick: () => void;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FinancialSummary({
  negocio,
  isActive,
  isGanho,
  icpScore,
  icpLabel,
  icpAction,
  hasQuestionnaire,
  onGanhoClick,
  onPerdaClick,
  onQualifierClick,
}: FinancialSummaryProps) {
  const handleCopyPaymentLink = () => {
    const link = generatePaymentLink(negocio);
    navigator.clipboard.writeText(link);
    toast.success("Link de pagamento copiado!");
  };

  return (
    <>
      {/* Quick action: Fechar Negocio */}
      {isActive && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onGanhoClick}
          >
            <Trophy className="h-3.5 w-3.5" /> Fechar como Ganho
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={onPerdaClick}
          >
            <X className="h-3.5 w-3.5" /> Fechar como Perdido
          </Button>
        </div>
      )}

      {/* Payment link for ganho */}
      {isGanho && (
        <section className="p-3 border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-500">Link de Pagamento / Contrato</span>
          </div>
          <div className="flex gap-2 items-center">
            <Input value={generatePaymentLink(negocio)} readOnly className="text-xs h-8 bg-background" />
            <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={handleCopyPaymentLink}>
              <Copy className="h-3 w-3" /> Copiar
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Envie este link para o cliente preencher os dados e confirmar o contrato.
          </p>
        </section>
      )}

      {/* Financial Summary */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Resumo Financeiro</h3>
        <div className="text-2xl font-bold text-foreground mb-2">{fmt(negocio.valor_liquido)}</div>
        {negocio.produtos.length > 0 && (
          <div className="space-y-1">
            {negocio.produtos.map((p: any, i: number) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{p.nome} ({p.quantidade}x)</span>
                <span className="font-mono text-foreground">{fmt(p.valorTotal)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span>Pgto: {FORMAS_PAGAMENTO.find(f => f.value === negocio.forma_pagamento)?.label || negocio.forma_pagamento}</span>
          <span>Cond: {negocio.condicao_pagamento}</span>
        </div>
      </section>

      <Separator />

      {/* ICP Qualification */}
      {hasQuestionnaire && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Qualificacao ICP</h3>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onQualifierClick}>
              <ClipboardList className="h-3 w-3" /> {icpScore ? 'Requalificar' : 'Qualificar Lead'}
            </Button>
          </div>
          {icpScore !== null && icpScore !== undefined && (
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-black ${
                icpLabel === 'quente' ? 'text-emerald-500' :
                icpLabel === 'morno' ? 'text-amber-500' : 'text-blue-400'
              }`}>{icpScore}/100</span>
              <Badge variant="secondary" className="capitalize">{icpLabel || 'frio'}</Badge>
            </div>
          )}
          {icpAction && (
            <p className="text-xs text-muted-foreground mt-1.5">{icpAction}</p>
          )}
        </section>
      )}

      <Separator />

      {/* Info */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Informacoes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <InfoItem label="Cliente" value={negocio.cliente_nome || '\u2014'} />
          <InfoItem label="Consultor" value={negocio.consultor_nome || '\u2014'} />
          {(negocio as any).phone_lead && (
            <InfoItem label="Telefone Lead" value={(negocio as any).phone_lead} />
          )}
          <InfoItem label="Origem" value={NEGOCIO_ORIGEM_LABELS[negocio.origem] || negocio.origem} />
          <InfoItem label="Probabilidade" value={`${negocio.probabilidade}%`} />
          <InfoItem label="Fechamento previsto" value={negocio.data_previsao_fechamento ? new Date(negocio.data_previsao_fechamento).toLocaleDateString('pt-BR') : '\u2014'} />
          <InfoItem label="Fechamento real" value={negocio.data_fechamento ? new Date(negocio.data_fechamento).toLocaleDateString('pt-BR') : '\u2014'} />
        </div>
        {negocio.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-2">
            {negocio.tags.map(t => <Badge key={t} variant="secondary" className="text-[9px]">{t}</Badge>)}
          </div>
        )}
      </section>

      <Separator />

      {/* Integrations */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Integracoes</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Cobranca</span>
            {negocio.cobranca_id ? (
              <Badge variant="default" className="text-[10px] gap-1"><CheckCircle className="h-3 w-3" /> Gerada</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">Nao gerada</Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Nota Fiscal</span>
            {negocio.nf_emitida_id ? (
              <Badge variant="default" className="text-[10px] gap-1"><CheckCircle className="h-3 w-3" /> Emitida</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">Nao emitida</Badge>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
