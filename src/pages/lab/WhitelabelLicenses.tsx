import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

export default function WhitelabelLicenses() {
  const { config } = useOutletContext<{ config: any }>();
  const licenseId = config?.licenses?.id;

  const { data: licenses, isLoading } = useQuery({
    queryKey: ['wl-licenses-list', licenseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('licenses')
        .select('*, tenants(name, email)')
        .eq('parent_license_id', licenseId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!licenseId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Licenças</h1>
        <p className="text-sm text-muted-foreground">Sub-licenças gerenciadas por {config?.display_name}</p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses?.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{l.tenants?.name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{l.tenants?.email || ''}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{l.plan}</Badge></TableCell>
                    <TableCell>
                      <Badge className={l.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}>
                        {l.status === 'active' ? 'Ativo' : l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">R$ {Number(l.monthly_value || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.expires_at ? new Date(l.expires_at).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {(!licenses || licenses.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma sub-licença encontrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
