import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Plus } from "lucide-react";
import { NFStatus, NFTipo } from "@/types/notasFiscais";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: NFStatus | "todas";
  onStatusChange: (v: NFStatus | "todas") => void;
  tipoFilter: NFTipo | "todos";
  onTipoChange: (v: NFTipo | "todos") => void;
  onExportCSV: () => void;
  onEmitir: () => void;
}

export default function NFFilters({ search, onSearchChange, statusFilter, onStatusChange, tipoFilter, onTipoChange, onExportCSV, onEmitir }: Props) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nº NF, cliente ou CNPJ..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-9" />
      </div>

      <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as NFStatus | "todas")}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas</SelectItem>
          <SelectItem value="emitida">Emitida</SelectItem>
          <SelectItem value="pendente">Pendente</SelectItem>
          <SelectItem value="cancelada">Cancelada</SelectItem>
          <SelectItem value="rejeitada">Rejeitada</SelectItem>
        </SelectContent>
      </Select>

      <Select value={tipoFilter} onValueChange={(v) => onTipoChange(v as NFTipo | "todos")}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="NFS-e">NFS-e</SelectItem>
          <SelectItem value="NF-e">NF-e</SelectItem>
          <SelectItem value="NFC-e">NFC-e</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={onExportCSV} className="gap-1.5">
        <Download className="h-3.5 w-3.5" /> CSV
      </Button>

      <Button size="sm" onClick={onEmitir} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Emitir Nota Fiscal
      </Button>
    </div>
  );
}
