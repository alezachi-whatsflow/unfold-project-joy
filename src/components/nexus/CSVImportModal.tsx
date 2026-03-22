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
  has_ia_auditor: boolean;
  has_ia_copiloto: boolean;
  has_ia_closer: boolean;
}

const STATUS_MAP: Record<string, string> = {
  'Ativo': 'active', 'ativo': 'active',
  'Inativo': 'inactive', 'inativo': 'inactive',
  'Bloqueado': 'blocked', 'bloqueado': 'blocked',
  'Em Pausa': 'suspended', 'em_pausa': 'suspended',
  'Trial': 'trial', 'trial': 'trial',
};

const BATCH_SIZE = 100;

function toDateOrNull(val: string): string | null {
  if (!val || val.trim() === '' || val === '—' || val.trim() === '-') return null;
  // dd/mm/yyyy → yyyy-mm-dd
  const match = val.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  // already yyyy-mm-dd or ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(val.trim())) return val.trim().slice(0, 10);
  return null;
}

function uniqueSlug(name: string, index: number): string {
  const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'empresa';
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}-${index}`;
}

export default function CSVImportModal({ open, onOpenChange, onImported }: Props) {
  const { nexusUser } = useNexus();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [firstError, setFirstError] = useState<string | null>(null);

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
        const company = get('EMPRESA / TITULAR') || get('EMPRESA');
        if (!company) continue; // skip empty rows

        parsed.push({
          whitelabel: get('WHITELABEL'),
          company_name: company,
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
          has_ia_auditor: get('AUDITOR').toUpperCase() === 'SIM' || get('AUDITOR') === '1',
          has_ia_copiloto: get('COPILOTO').toUpperCase() === 'SIM' || get('COPILOTO') === '1',
          has_ia_closer: get('CLOSER').toUpperCase() === 'SIM' || get('CLOSER') === '1',
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
    setFirstError(null);
    let totalSuccess = 0, totalFailed = 0;

    // Pre-load whitelabel parent license IDs (slug → license id map)
    // "whatsflow" is the parent company, not a WL — treat as direct contract
    const DIRECT_CONTRACT_NAMES = ['whatsflow', 'wf', ''];
    const wlSlugs = [...new Set(rows.map(r => r.whitelabel).filter(v => v && !DIRECT_CONTRACT_NAMES.includes(v.toLowerCase())))];
    const wlMap: Record<string, string> = {};
    if (wlSlugs.length > 0) {
      // Search by slug (lowercase) and also by display name (case-insensitive)
      const slugsLower = wlSlugs.map(s => s.toLowerCase());
      const { data: wlLicenses } = await supabase
        .from('licenses')
        .select('id, whitelabel_slug, tenants(name)');
      (wlLicenses || []).forEach((l: any) => {
        if (l.whitelabel_slug) {
          // Map by exact slug
          wlMap[l.whitelabel_slug] = l.id;
          // Also map by slug lowercase
          wlMap[l.whitelabel_slug.toLowerCase()] = l.id;
          // Also map by tenant name (case-insensitive) for CSV matching
          if (l.tenants?.name) wlMap[l.tenants.name.toLowerCase()] = l.id;
        }
      });
    }

    // Split into batches
    const batches: ParsedRow[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE));
    }

    setProgress({ current: 0, total: rows.length });

    let globalIndex = 0;
    for (const batch of batches) {
      try {
        // 1. Insert all tenants in this batch at once
        const tenantData = batch.map((row, bIdx) => ({
          name: row.company_name,
          slug: uniqueSlug(row.company_name, globalIndex + bIdx),
          email: row.email || null,
        }));

        const { data: tenants, error: tErr } = await supabase
          .from('tenants')
          .insert(tenantData)
          .select('id');

        if (tErr || !tenants || tenants.length !== batch.length) {
          if (tErr && !firstError) setFirstError(`Tenant: ${tErr.message}`);
          totalFailed += batch.length;
          globalIndex += batch.length;
          setProgress(p => ({ ...p, current: p.current + batch.length }));
          continue;
        }

        // 2. Insert all licenses for this batch at once
        const licenseData = batch.map((row, bIdx) => ({
          tenant_id: tenants[bIdx].id,
          plan: 'profissional',
          license_type: 'individual',
          status: row.status,
          monthly_value: row.monthly_value,
          base_devices_web: row.devices_official,
          base_devices_meta: row.devices_unofficial,
          base_attendants: row.attendants || 1,
          billing_cycle: row.billing_cycle || 'monthly',
          starts_at: toDateOrNull(row.activated_at) || new Date().toISOString().slice(0, 10),
          expires_at: toDateOrNull(row.expires_at),
          parent_license_id: row.whitelabel && !DIRECT_CONTRACT_NAMES.includes(row.whitelabel.toLowerCase())
            ? (wlMap[row.whitelabel.toLowerCase()] || wlMap[row.whitelabel] || null)
            : null,
          internal_notes: row.whitelabel ? `Importado via CSV. WL: ${row.whitelabel}` : 'Importado via CSV (contrato direto)',
        }));

        const { error: lErr } = await supabase.from('licenses').insert(licenseData);
        if (lErr) {
          if (!firstError) setFirstError(`License: ${lErr.message}`);
          // If license batch fails, rollback tenants
          const tenantIds = tenants.map(t => t.id);
          await supabase.from('tenants').delete().in('id', tenantIds);
          totalFailed += batch.length;
        } else {
          totalSuccess += batch.length;
        }
      } catch {
        totalFailed += batch.length;
      }

      globalIndex += batch.length;
      setProgress({ current: globalIndex, total: rows.length });
    }

    await supabase.from('nexus_audit_logs').insert({
      actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
      action: 'csv_import',
      target_entity: `${totalSuccess} importados, ${totalFailed} falhas`,
    });

    setImportResults({ success: totalSuccess, failed: totalFailed });
    setDone(true);
    setImporting(false);
    toast({ title: `Importação concluída: ${totalSuccess} sucesso, ${totalFailed} falhas` });
    onImported();
  }

  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

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
              <div className="space-y-1">
                <p className="text-sm text-red-400">{importResults.failed} falhas</p>
                {firstError && (
                  <p className="text-xs text-red-300 bg-red-950/30 border border-red-800/30 rounded px-3 py-2 text-left font-mono break-all">
                    {firstError}
                  </p>
                )}
              </div>
            )}
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        ) : importing ? (
          <div className="py-10 space-y-5 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Importando... {progress.current} / {progress.total} registros
              </p>
              <div className="w-full bg-muted rounded-full h-2.5 mx-auto max-w-xs">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{progressPct}% concluído</p>
            </div>
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
                  <p key={i} className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{e}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {rows.length} registros encontrados. Preview das primeiras 10 linhas:
            </p>
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
              <Button onClick={handleImport}>
                Importar {rows.length} registros
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
