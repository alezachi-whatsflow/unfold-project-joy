import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Wifi,
  Cpu,
  MessageSquare,
  HardDrive,
  Bot,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PoolConsumptionBarProps {
  wlLicenseId: string;
}

interface PoolLicense {
  pool_max_attendants: number | null;
  pool_max_devices_web: number | null;
  pool_max_devices_meta: number | null;
  pool_max_messages: number | null;
  pool_max_storage_gb: number | null;
  pool_max_ai_agents: number | null;
}

interface PoolConsumed {
  consumed_attendants: number;
  consumed_devices_web: number;
  consumed_devices_meta: number;
  consumed_messages: number;
  consumed_storage_gb: number;
  consumed_ai_agents: number;
}

interface ResourceDef {
  label: string;
  maxKey: keyof PoolLicense;
  consumedKey: keyof PoolConsumed;
  icon: LucideIcon;
  format?: (v: number) => string;
}

const RESOURCES: ResourceDef[] = [
  { label: "Atendentes", maxKey: "pool_max_attendants", consumedKey: "consumed_attendants", icon: Users },
  { label: "Dispositivos Web", maxKey: "pool_max_devices_web", consumedKey: "consumed_devices_web", icon: Wifi },
  { label: "Dispositivos Meta", maxKey: "pool_max_devices_meta", consumedKey: "consumed_devices_meta", icon: Cpu },
  { label: "Mensagens", maxKey: "pool_max_messages", consumedKey: "consumed_messages", icon: MessageSquare },
  {
    label: "Storage (GB)",
    maxKey: "pool_max_storage_gb",
    consumedKey: "consumed_storage_gb",
    icon: HardDrive,
    format: (v) => v.toFixed(1),
  },
  { label: "Agentes I.A.", maxKey: "pool_max_ai_agents", consumedKey: "consumed_ai_agents", icon: Bot },
];

function barColor(pct: number): string {
  if (pct > 85) return "bg-red-500";
  if (pct >= 60) return "bg-yellow-500";
  return "bg-green-500";
}

export default function PoolConsumptionBar({ wlLicenseId }: PoolConsumptionBarProps) {
  const {
    data: license,
    isLoading: loadingLicense,
  } = useQuery({
    queryKey: ["wl-pool-license", wlLicenseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("licenses")
        .select(
          "pool_max_attendants, pool_max_devices_web, pool_max_devices_meta, pool_max_messages, pool_max_storage_gb, pool_max_ai_agents"
        )
        .eq("id", wlLicenseId)
        .maybeSingle();
      if (error) throw error;
      return data as PoolLicense | null;
    },
    enabled: !!wlLicenseId,
  });

  const {
    data: consumed,
    isLoading: loadingConsumed,
  } = useQuery({
    queryKey: ["wl-pool-consumed", wlLicenseId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pool_consumed", {
        parent_id: wlLicenseId,
      });
      if (error) throw error;
      return data as unknown as PoolConsumed;
    },
    enabled: !!wlLicenseId,
  });

  if (loadingLicense || loadingConsumed) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando consumo do pool...</span>
        </CardContent>
      </Card>
    );
  }

  if (!license || !consumed) return null;

  const visibleResources = RESOURCES.filter((r) => {
    const max = license[r.maxKey] as number | null;
    return max != null && max > 0;
  });

  if (visibleResources.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardContent className="py-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleResources.map((res) => {
            const max = (license[res.maxKey] as number) ?? 0;
            const used = (consumed[res.consumedKey] as number) ?? 0;
            const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
            const fmt = res.format ?? ((v: number) => String(v));
            const Icon = res.icon;

            return (
              <div key={res.maxKey} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {res.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmt(used)} / {fmt(max)} ({pct.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all ${barColor(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
