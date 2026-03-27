import { useOutletContext } from "react-router-dom";

export default function GodAdminFeatureFlags() {
  const { environment } = useOutletContext<{ environment: string }>();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
        <p className="text-muted-foreground">
          Habilite e desabilite features progressivamente
        </p>
      </div>
      <div className="border p-4 bg-card">
        Gestão de Features ({environment})
      </div>
    </div>
  );
}
