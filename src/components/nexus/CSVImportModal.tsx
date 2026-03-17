import { useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useNexus } from '@/contexts/NexusContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

interface ParsedRow {
  whitelabel: string;
  company_name: string;
  email: string;
  status: string;
  activated_at: string;
  cancelled_at: string;
  blocked_at: string;
  unblocked_at: string;
  expires_at: string;
  devices_official: number;
  devices_unofficial: number;
  attendants: number;
  additional_value: number;
  checkout_platform: string;
  billing_cycle: string;
  payment_method: string;
  payment_condition: string;
  monthly_value: number;
}

const STATUS_MAP: Record<string, string> = {
  'Ativo': 'active', 'ativo': 'active',
  'Inativo': 'inactive', 'inativo': 'inactive',
  'Bloqueado': 'blocked', 'bloqueado': 'blocked',
  'Em Pausa': 'suspended', 'em_pausa': 'suspended',
  'Trial': 'trial', 'trial': 'trial',
};

export default function CSVImportModal({ open, onOpenChange, onImported }: Props) {
  const { nexusUser } = useNexus();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });

  function parseCSV(text: string) {
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) { setErrors(['Arquivo vazio ou sem dados']); return; }

    const header = lines[0].split(';').map((h) => h.trim().toUpperCase());
    const parsed: ParsedRow[] = [];
    const errs: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';').map((c) => c.trim());
      try {
        const get = (name: string) => {
          const idx = header.indexOf(name);
          return idx >= 0 ? cols[idx] || '' : '';
        };
        parsed.push({
          whitelabel: get('WHITELABEL'),
          company_name: get('EMPRESA / TITULAR') || get('EMPRESA'),
          email: get('EMAIL'),
          status: STATUS_MAP[get('STATUS')] || 'active',
          activated_at: get('ATIVAÇÃO') || get('ATIVACAO'),
          cancelled_at: get('CANCELADO'),
          blocked_at: get('BLOQUEIO'),
          unblocked_at: get('DESBLOQUEIO'),
          expires_at: get('VENCIMENTO'),
          devices_official: parseInt(get('DISP. OFICIAL')) || 0,
          devices_unofficial: parseInt(get('DISP. NÃO OFICIAL') || get('DISP. NAO OFICIAL')) || 0,
          attendants: parseInt(get('ATENDENTES')) || 1,
          additional_value: parseFloat(get('ADCIONAL') || get('ADICIONAL')) || 0,
          checkout_platform: get('CHECKOUT'),
          billing_cycle: get('RECEITA'),
          payment_method: get('TIPO PAGAMENTO'),
          payment_condition: get('CONDIÇÃO') || get('CONDICAO'),
          monthly_value: parseFloat(get('VALOR COBRANÇA') || get('VALOR COBRANCA') || '0') || 0,
        });
      } catch {
        errs.push(`Linha ${i + 1}: erro de parsing`);
      }
    }
    setRows(parsed);
    setErrors(errs);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target?.result as string);
    reader.readAsText(file, 'utf-8');
  }

  async function handleImport() {
    setImporting(true);
    let success = 0, failed = 0;

    for (const row of rows) {
      try {
        // Create tenant
        const slug = row.company_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50);
        const { data: tenant, error: tErr } = await supabase.from('tenants').insert({
          name: row.company_name, slug: `${slug}-${Date.now()}`, email: row.email,
        }).select('id').single();

        if (tErr || !tenant) { failed++; continue; }

        await supabase.from('licenses').insert({
          tenant_id: tenant.id,
          plan: 'profissional',
          status: row.status,
          monthly_value: row.monthly_value,
          base_devices_web: row.devices_official,
          base_attendants: row.attendants,
          billing_cycle: row.billing_cycle || 'monthly',
          internal_notes: `Importado via CSV. Whitelabel: ${row.whitelabel}`,
        });
        success++;
      } catch {
        failed++;
      }
    }

    await supabase.from('nexus_audit_logs').insert({
      actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
      action: 'csv_import', target_entity: `${success} importados, ${failed} falhas`,
    });

    setImportResults({ success, failed });
    setDone(true);
    setImporting(false);
    toast({ title: `Importação concluída: ${success} sucesso, ${failed} falhas` });
    onImported();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar CSV de Licenças</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="text-lg font-semibold">{importResults.success} licenças importadas</p>
            {importResults.failed > 0 && (
              <p className="text-sm text-red-400">{importResults.failed} falhas</p>
            )}
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Selecione um arquivo CSV (separador ;)</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()}>Selecionar Arquivo</Button>
            {errors.length > 0 && (
              <div className="text-left space-y-1">
                {errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{e}</p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{rows.length} registros encontrados. Preview das primeiras 10 linhas:</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Whitelabel</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 10).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{r.company_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.email}</TableCell>
                      <TableCell><Badge className="text-[10px]">{r.status}</Badge></TableCell>
                      <TableCell className="text-xs">{r.whitelabel}</TableCell>
                      <TableCell className="text-sm">R$ {r.monthly_value.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {errors.length > 0 && (
              <div className="space-y-1">
                {errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400">{e}</p>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRows([]); setErrors([]); }}>Voltar</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Importar {rows.length} registros
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
