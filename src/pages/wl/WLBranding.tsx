import { useOutletContext } from "react-router-dom";
import { Paintbrush, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WLBranding() {
  const { branding } = useOutletContext<{ branding: any }>();
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Branding</h1>
          <p className="text-white/60">
            Personalize a identidade visual do portal dos seus clientes.
          </p>
        </div>
        <Button 
          className="text-white font-semibold"
          style={{ backgroundColor: 'var(--wl-primary)' }}
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
              <Paintbrush className="h-4 w-4" /> Cores Principais
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm font-medium text-white/80">Cor Primária</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50">{branding?.primary_color}</span>
                  <div className="h-8 w-8 rounded-full shadow-inner" style={{ backgroundColor: 'var(--wl-primary)' }}></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm font-medium text-white/80">Cor Secundária (Sidebar)</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50">{branding?.secondary_color}</span>
                  <div className="h-8 w-8 rounded-full shadow-inner border border-white/10" style={{ backgroundColor: 'var(--wl-secondary)' }}></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm font-medium text-white/80">Cor de Fundo</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50">{branding?.background_color}</span>
                  <div className="h-8 w-8 rounded-full shadow-inner border border-white/10" style={{ backgroundColor: 'var(--wl-bg)' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="sticky top-6 rounded-xl border border-white/10 bg-black/40 p-6 overflow-hidden">
            <h3 className="font-semibold text-white/60 text-sm mb-4">Preview ao Vivo</h3>
            
            <div className="rounded-lg shadow-2xl overflow-hidden border border-white/10 flex flex-col h-[300px]" style={{ backgroundColor: 'var(--wl-bg)' }}>
              <div className="h-12 border-b flex items-center px-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="h-6 w-6 rounded bg-white/10 flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: 'var(--wl-primary)' }}>
                  A
                </div>
                <div className="ml-auto w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--wl-accent)' }}></div>
              </div>
              <div className="flex flex-1">
                <div className="w-16 border-r flex pt-4 flex-col items-center gap-4" style={{ backgroundColor: 'var(--wl-secondary)', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="w-8 h-8 rounded bg-white/10" style={{ backgroundColor: 'var(--wl-primary)' }}></div>
                  <div className="w-8 h-8 rounded bg-white/5"></div>
                  <div className="w-8 h-8 rounded bg-white/5"></div>
                </div>
                <div className="flex-1 p-4">
                  <div className="w-32 h-6 rounded bg-white/5 mb-4 border border-white/5"></div>
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 h-20 rounded bg-white/5 border border-white/5 p-3">
                      <div className="w-16 h-4 bg-white/10 rounded mb-2"></div>
                      <div className="w-10 h-6 bg-white/20 rounded"></div>
                    </div>
                    <div className="flex-1 h-20 rounded bg-white/5 border border-white/5 p-3">
                      <div className="w-16 h-4 bg-white/10 rounded mb-2"></div>
                      <div className="w-10 h-6 bg-white/20 rounded" style={{ backgroundColor: 'var(--wl-primary)' }}></div>
                    </div>
                  </div>
                  <div className="w-full h-24 rounded border border-white/5 bg-white/5"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
