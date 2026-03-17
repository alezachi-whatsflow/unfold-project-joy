import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Globe, CreditCard, DollarSign } from 'lucide-react';

const WHITELABELS = [
  'Whatsflow', 'Clint', 'SendHit', 'Voicecoder', 'MSolutions',
  'Big8Chat', 'AgiliChat', 'BotFlux',
];

const PLANS = [
  { name: 'Solo Pro', base: 259 },
  { name: 'Profissional', base: 359 },
];

const INTEGRATIONS = [
  { name: 'Asaas', status: 'active' },
  { name: 'Routerfy', status: 'inactive' },
  { name: 'Eduzz', status: 'inactive' },
];

export default function NexusConfiguracoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6" /> Configurações
        </h1>
        <p className="text-sm text-muted-foreground">Configurações gerais do sistema Nexus</p>
      </div>

      {/* Whitelabels */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> Whitelabels Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {WHITELABELS.map((w) => (
              <Badge key={w} variant="outline" className="text-sm py-1 px-3">{w}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plans & Pricing */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Planos e Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {PLANS.map((p) => (
            <div key={p.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm font-medium">{p.name}</span>
              <span className="text-sm text-primary font-bold">R$ {p.base},00/mês</span>
            </div>
          ))}
          <div className="text-xs text-muted-foreground space-y-1 pt-2">
            <p>• Extra Disp. Web: R$ 150 (1-5) / R$ 125 (6-20) / R$ 100 (21+)</p>
            <p>• Extra Disp. Meta: R$ 100 (1-5) / R$ 80 (6-20) / R$ 60 (21+)</p>
            <p>• Extra Atendentes: R$ 80 (1-5) / R$ 75 (6-10) / R$ 70 (11-20) / R$ 60 (21+)</p>
            <p>• Módulo I.A.: R$ 350/mês</p>
            <p>• Facilite: Básico R$ 250 / Intermediário R$ 700 / Avançado R$ 1.500</p>
          </div>
        </CardContent>
      </Card>

      {/* Billing Integrations */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Integrações de Cobrança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {INTEGRATIONS.map((i) => (
            <div key={i.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm font-medium">{i.name}</span>
              <Badge className={`text-[10px] ${i.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                {i.status === 'active' ? 'Conectado' : 'Inativo'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
