import { useEffect, useState } from "react";
import { Calendar, MapPin, Users, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Campaign {
  id: string;
  niche: string;
  city: string;
  leads_found: number;
  hot_leads: number;
  results: any[];
  created_at: string;
}

interface Props {
  onLoadCampaign: (campaign: Campaign) => void;
}

export function CampaignHistory({ onLoadCampaign }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("prospect_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setCampaigns((data as Campaign[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <p className="text-xs text-muted-foreground text-center py-4">Carregando histórico...</p>;
  if (campaigns.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Nenhuma campanha anterior.</p>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Histórico de Campanhas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {campaigns.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 border border-border hover:bg-accent/50 transition-colors">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{c.niche}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.city}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.leads_found} leads</span>
                {c.hot_leads > 0 && <span className="flex items-center gap-1 text-green-500"><Flame className="h-3 w-3" />{c.hot_leads} quentes</span>}
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onLoadCampaign(c)}>Carregar</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
