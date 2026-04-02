import { useState } from "react";
import { useNegocios } from "@/hooks/useNegocios";
import { useICPProfile } from "@/hooks/useICPProfile";
import { useTenantId } from "@/hooks/useTenantId";
import { useTickets } from "@/hooks/useTickets";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { NEGOCIO_STATUS_CONFIG, type Negocio, type NegocioStatus } from "@/types/vendas";
import NegocioEditModal from "./NegocioEditModal";
import FechamentoGanhoModal from "./FechamentoGanhoModal";
import MotivoPerdaModal from "./MotivoPerdaModal";
import QualifierModal from "@/components/sales/QualifierModal";
import { LifeBuoy } from "lucide-react";
import DrawerHeader from "./drawer/DrawerHeader";
import DigitalIntelligenceSection from "./drawer/DigitalIntelligenceSection";
import FinancialSummary from "./drawer/FinancialSummary";
import NegocioTimeline from "./drawer/NegocioTimeline";

interface Props {
  negocio: Negocio;
  onClose: () => void;
}

export default function NegocioDrawer({ negocio, onClose }: Props) {
  const tenantId = useTenantId();
  const { changeStatus, addHistoricoItem, deleteNegocio, updateNegocio } = useNegocios(tenantId);
  const { questionnaire, icpProfile } = useICPProfile(tenantId);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(negocio.titulo);
  const [editOpen, setEditOpen] = useState(false);
  const [ganhoModal, setGanhoModal] = useState(false);
  const [perdaModal, setPerdaModal] = useState(false);
  const [qualifierOpen, setQualifierOpen] = useState(false);
  const [localIcp, setLocalIcp] = useState<{ score: number; label: string; action?: string } | null>(null);

  const icpScore = localIcp?.score ?? (negocio as any).icp_score;
  const icpLabel = localIcp?.label ?? (negocio as any).icp_label;
  const icpAction = localIcp?.action ?? (negocio as any).recommended_action;

  const isDI = negocio.origem === "digital_intelligence";
  const isActive = !['fechado_ganho', 'fechado_perdido'].includes(negocio.status);
  const isGanho = negocio.status === 'fechado_ganho';
  const hasQuestionnaire = questionnaire?.questions?.length > 0;

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'fechado_ganho') { setGanhoModal(true); return; }
    if (newStatus === 'fechado_perdido') { setPerdaModal(true); return; }
    await changeStatus(negocio, newStatus as NegocioStatus);
    toast.success(`Status alterado para ${NEGOCIO_STATUS_CONFIG[newStatus as NegocioStatus].label}`);
  };

  const handleSaveTitle = async () => {
    if (title !== negocio.titulo) {
      await updateNegocio(negocio.id, { titulo: title } as any);
      toast.success("Título atualizado");
    }
    setEditingTitle(false);
  };

  const handleDelete = async () => {
    if (!confirm("Excluir este negócio?")) return;
    await deleteNegocio(negocio.id);
    toast.success("Negócio excluído");
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      <DrawerHeader
        negocio={negocio}
        editingTitle={editingTitle}
        title={title}
        onTitleChange={setTitle}
        onTitleClick={() => setEditingTitle(true)}
        onTitleSave={handleSaveTitle}
        onStatusChange={handleStatusChange}
        onEditClick={() => setEditOpen(true)}
        onDeleteClick={handleDelete}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <FinancialSummary
          negocio={negocio}
          isActive={isActive}
          isGanho={isGanho}
          icpScore={icpScore}
          icpLabel={icpLabel}
          icpAction={icpAction}
          hasQuestionnaire={hasQuestionnaire}
          onGanhoClick={() => setGanhoModal(true)}
          onPerdaClick={() => setPerdaModal(true)}
          onQualifierClick={() => setQualifierOpen(true)}
        />

        {isDI && <DigitalIntelligenceSection negocio={negocio} />}

        {/* Quick Ticket Button */}
        <CreateTicketFromNegocio negocio={negocio} />

        <NegocioTimeline negocio={negocio} onAddHistoricoItem={addHistoricoItem} />
      </div>

      {/* Modals */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <NegocioEditModal negocio={negocio} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      {ganhoModal && (
        <FechamentoGanhoModal negocio={negocio} onClose={() => setGanhoModal(false)} />
      )}

      {perdaModal && (
        <MotivoPerdaModal negocio={negocio} onClose={() => setPerdaModal(false)} />
      )}

      {hasQuestionnaire && (
        /* @ts-ignore */
        <QualifierModal
          open={qualifierOpen}
          onOpenChange={setQualifierOpen}
          leadName={negocio.cliente_nome || negocio.titulo}
          questions={questionnaire.questions}
          hotThreshold={icpProfile?.hot_score_threshold}
          warmThreshold={icpProfile?.warm_score_threshold}
          existingAnswers={(negocio as any).questionnaire_answers || {}}
          onComplete={async (result, answers) => {
            await updateNegocio(negocio.id, {
              icp_score: result.score,
              icp_label: result.label,
              icp_radar: result.radar,
              recommended_action: result.recommended_action,
              questionnaire_answers: answers,
            } as any);
            setLocalIcp({ score: result.score, label: result.label, action: result.recommended_action });
          }}
        />
      )}
    </div>
  );
}

/* ── Quick ticket creation from negocio ── */
function CreateTicketFromNegocio({ negocio }: { negocio: Negocio }) {
  const { createTicket } = useTickets();

  return (
    <button
      onClick={() => createTicket.mutate({
        title: `Demanda: ${negocio.titulo}`,
        description: `Ticket vinculado ao negocio "${negocio.titulo}" (${negocio.cliente_nome || "sem cliente"})`,
        reference_type: "negocio",
        reference_id: negocio.id,
        category: "commercial",
      })}
      disabled={createTicket.isPending}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground border border-dashed border-border rounded-lg hover:bg-muted/50 hover:text-foreground transition-colors"
    >
      <LifeBuoy className="h-3.5 w-3.5" />
      {createTicket.isPending ? "Criando..." : "Abrir Ticket de Suporte"}
    </button>
  );
}
