import { useOutletContext } from "react-router-dom";

export default function GodAdminAuditLog() {
  const { environment } = useOutletContext<{ environment: string }>();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Histórico global de ações do sistema
        </p>
      </div>
      <div className="rounded-md border p-4 bg-card">
        Tabela de Audit Logs ({environment})
      </div>
    </div>
  );
}
