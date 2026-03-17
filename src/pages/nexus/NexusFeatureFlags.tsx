import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Flag } from 'lucide-react';

export default function NexusFeatureFlags() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlags();
  }, []);

  async function loadFlags() {
    setLoading(true);
    const { data } = await supabase
      .from('nexus_feature_flags')
      .select('*')
      .order('created_at', { ascending: false });
    setFlags(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Flag className="h-6 w-6" /> Feature Flags
          </h1>
          <p className="text-sm text-muted-foreground">Controle de features globais e por licença</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Flag
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : flags.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma feature flag cadastrada
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {flags.map((flag) => (
            <Card key={flag.id} className="bg-card/50 border-border/50">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-foreground">{flag.flag_key}</code>
                    {flag.is_global && (
                      <Badge className="text-[10px] bg-blue-500/20 text-blue-400">Global</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{flag.description || 'Sem descrição'}</p>
                </div>
                <Switch checked={flag.default_value} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
