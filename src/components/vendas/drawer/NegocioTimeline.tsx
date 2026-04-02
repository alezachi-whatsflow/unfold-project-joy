import { fmtDate, fmtTime } from "@/lib/dateUtils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, CalendarDays, Send } from "lucide-react";
import { toast } from "sonner";
import type { Negocio } from "@/types/vendas";

interface NegocioTimelineProps {
  negocio: Negocio;
  onAddHistoricoItem: (negocio: Negocio, item: { tipo: string; descricao: string }) => Promise<void>;
}

export default function NegocioTimeline({ negocio, onAddHistoricoItem }: NegocioTimelineProps) {
  const [newNote, setNewNote] = useState("");

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await onAddHistoricoItem(negocio, { tipo: 'nota', descricao: newNote });
    setNewNote("");
    toast.success("Nota adicionada");
  };

  const handleAddActivity = async (tipo: 'ligacao' | 'email' | 'reuniao', label: string) => {
    await onAddHistoricoItem(negocio, { tipo, descricao: `${label} registrada` });
    toast.success(`${label} registrada`);
  };

  return (
    <>
      <Separator />

      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Historico</h3>
        <div className="space-y-3">
          {negocio.historico.slice().reverse().map((h: any) => (
            <div key={h.id} className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <div>
                <p className="text-xs text-foreground">{h.descricao}</p>
                <p className="text-[10px] text-muted-foreground">
                  {fmtDate(h.data)} {fmtTime(h.data)}
                  {h.usuarioNome && ` \u2014 ${h.usuarioNome}`}
                </p>
              </div>
            </div>
          ))}
          {negocio.historico.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma atividade</p>}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleAddActivity('ligacao', 'Ligacao')}><Phone className="mr-1 h-3 w-3" /> Ligacao</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleAddActivity('email', 'E-mail')}><Mail className="mr-1 h-3 w-3" /> E-mail</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleAddActivity('reuniao', 'Reuniao')}><CalendarDays className="mr-1 h-3 w-3" /> Reuniao</Button>
        </div>

        {/* Add Note */}
        <div className="flex gap-2 mt-3">
          <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Adicionar nota..." className="h-8 text-xs" onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }} />
          <Button variant="outline" size="sm" onClick={handleAddNote}><Send className="h-3 w-3" /></Button>
        </div>
      </section>

      {/* Loss reason */}
      {negocio.status === 'fechado_perdido' && negocio.motivo_perda && (
        <>
          <Separator />
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Motivo da Perda</h3>
            <p className="text-sm text-foreground">{negocio.motivo_perda}</p>
            {negocio.motivo_perda_detalhe && <p className="text-xs text-muted-foreground mt-1">{negocio.motivo_perda_detalhe}</p>}
          </section>
        </>
      )}
    </>
  );
}
