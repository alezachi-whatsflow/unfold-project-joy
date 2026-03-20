import { useOutletContext } from "react-router-dom";

export default function GodAdminConfig() {
  const { environment } = useOutletContext<{ environment: string }>();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Configurações globais do sistema
        </p>
      </div>
      <div className="rounded-md border p-4 bg-card">
        Painel de Configuração ({environment})
      </div>
    </div>
  );
}
