import { useState } from "react";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, User, Phone } from "lucide-react";
import { NEGOCIO_STATUS_CONFIG, ALL_STATUSES, type Negocio, type NegocioStatus } from "@/types/vendas";
import { getPhoneFromNotas } from "../notesUtils";

interface DrawerHeaderProps {
  negocio: Negocio;
  editingTitle: boolean;
  title: string;
  onTitleChange: (v: string) => void;
  onTitleClick: () => void;
  onTitleSave: () => void;
  onStatusChange: (status: string) => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
}

export default function DrawerHeader({
  negocio,
  editingTitle,
  title,
  onTitleChange,
  onTitleClick,
  onTitleSave,
  onStatusChange,
  onEditClick,
  onDeleteClick,
}: DrawerHeaderProps) {
  const sc = NEGOCIO_STATUS_CONFIG[negocio.status];
  const phoneLead = (negocio as Record<string, any>).phone_lead || getPhoneFromNotas(negocio.notas);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="p-4 border-b border-border/40">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <Input value={title} onChange={e => onTitleChange(e.target.value)} onBlur={onTitleSave} onKeyDown={e => { if (e.key === 'Enter') onTitleSave(); }} autoFocus className="text-sm font-bold" />
          ) : (
            <h2 className="text-sm font-bold text-foreground cursor-pointer hover:text-primary" onClick={onTitleClick}>{negocio.titulo}</h2>
          )}

          {(negocio.cliente_nome || phoneLead) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-medium min-w-0">
              {negocio.cliente_nome && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {negocio.cliente_nome}
                </span>
              )}
              {phoneLead && (
                <a
                  href={`https://wa.me/${phoneLead.replace(/\D/g, '').startsWith('55') ? phoneLead.replace(/\D/g, '') : '55' + phoneLead.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400 hover:underline transition-colors"
                  title="Chamar no WhatsApp"
                >
                  <Phone className="h-3 w-3" />
                  {phoneLead}
                </a>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <Select value={negocio.status} onValueChange={onStatusChange}>
              <SelectTrigger className="h-7 w-auto">
                <Badge className="text-[10px]" style={{ background: `${sc.color}20`, color: sc.color, border: `1px solid ${sc.color}40` }}>
                  {sc.label}
                </Badge>
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: NEGOCIO_STATUS_CONFIG[s].color }} />
                      {NEGOCIO_STATUS_CONFIG[s].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Action buttons — spaced away from drawer close (X) */}
            <PermissionGate module="vendas" action="edit">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={onEditClick} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
            </PermissionGate>
            <PermissionGate module="vendas" action="delete">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)} title="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir negocio?</AlertDialogTitle>
            <AlertDialogDescription>
              O negocio "{negocio.titulo}" sera excluido permanentemente. Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteClick} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
