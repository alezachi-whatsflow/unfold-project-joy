import { useOutletContext } from "react-router-dom";

export default function WLConfig() {
  const { branding } = useOutletContext<{ branding: any }>();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-white">Configurações</h1>
      <p className="text-white/60">Configurações da sua WhiteLabel.</p>
    </div>
  );
}
