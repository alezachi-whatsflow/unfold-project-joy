import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';

const PAGE_SIZE = 50;

const STATUS_BADGES: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-muted text-muted-foreground',
  blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
  suspended: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export default function NexusLicenses() {
  const { can } = useNexus();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadLicenses();
  }, [page, statusFilter]);

  async function loadLicenses() {
    setLoading(true);
    let query = supabase
      .from('licenses')
      .select('*, tenants!inner(name, slug, email, cpf_cnpj)', { count: 'exact' });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error) {
      setLicenses(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return licenses;
    const q = search.toLowerCase();
    return licenses.filter((l: any) => {
      const tenantName = l.tenants?.name?.toLowerCase() || '';
      const tenantEmail = l.tenants?.email?.toLowerCase() || '';
      return tenantName.includes(q) || tenantEmail.includes(q);
    });
  }, [licenses, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Licenças</h1>
          <p className="text-sm text-muted-foreground">{total} licenças no total</p>
        </div>
        {can(['nexus_superadmin', 'nexus_suporte_senior']) && (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nova Licença
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
            <SelectItem value="suspended">Suspenso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Dispositivos</TableHead>
                    <TableHead>Atendentes</TableHead>
                    <TableHead>I.A.</TableHead>
                    <TableHead>Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l: any) => (
                    <TableRow key={l.id} className="hover:bg-accent/30 cursor-pointer">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{l.tenants?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{l.tenants?.email || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {l.plan === 'profissional' ? 'Profissional' : l.plan === 'solo_pro' ? 'Solo Pro' : l.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${STATUS_BADGES[l.status] || ''}`}>
                          {l.status === 'active' ? 'Ativo' : l.status === 'inactive' ? 'Inativo' : l.status === 'blocked' ? 'Bloqueado' : l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        R$ {Number(l.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm text-center">
                        {(l.base_devices_web || 0) + (l.extra_devices_web || 0) + (l.base_devices_meta || 0) + (l.extra_devices_meta || 0)}
                      </TableCell>
                      <TableCell className="text-sm text-center">
                        {(l.base_attendants || 0) + (l.extra_attendants || 0)}
                      </TableCell>
                      <TableCell>
                        {l.has_ai_module ? (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">IA</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.expires_at ? new Date(l.expires_at).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma licença encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Página {page + 1} de {totalPages || 1} ({total} registros)
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
