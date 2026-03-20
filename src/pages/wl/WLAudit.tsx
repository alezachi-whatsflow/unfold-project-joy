import { useOutletContext } from "react-router-dom";

export default function WLAudit() {
  const { branding } = useOutletContext<{ branding: any }>();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-white">Suporte / Audit</h1>
      <p className="text-white/60">Histórico de ações e suporte a clientes.</p>
    </div>
  );
}
