import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SuperAdminConfig() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6" /> Configurações
        </h1>
        <p className="text-sm text-muted-foreground">Configurações globais do SuperAdmin</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feature Flags</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Em breve — controle de features por tenant.</p>
        </CardContent>
      </Card>
    </div>
  );
}
