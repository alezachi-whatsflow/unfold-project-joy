/**
 * CustomFieldsBuilder — Visual JSONB editor for pipeline custom fields.
 * Zero-code interface: user sees labels/inputs, we manage the card_schema array.
 */
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Plus, Trash2, GripVertical, Type, Hash, DollarSign, Calendar,
  List, ToggleLeft, Link, Mail, Phone, Save, Loader2,
} from "lucide-react"
import { toast } from "sonner"
import type { CardFieldSchema, CardFieldType } from "@/types/vendas"

const FIELD_TYPES: { value: CardFieldType; label: string; icon: any }[] = [
  { value: "text", label: "Texto", icon: Type },
  { value: "number", label: "Numero", icon: Hash },
  { value: "currency", label: "Moeda (R$)", icon: DollarSign },
  { value: "date", label: "Data", icon: Calendar },
  { value: "select", label: "Selecao", icon: List },
  { value: "boolean", label: "Sim/Nao", icon: ToggleLeft },
  { value: "url", label: "URL", icon: Link },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "phone", label: "Telefone", icon: Phone },
]

function toSnakeCase(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
}

interface Props {
  fields: CardFieldSchema[]
  onChange: (fields: CardFieldSchema[]) => void
  saving?: boolean
  onSave?: () => void
}

export default function CustomFieldsBuilder({ fields, onChange, saving, onSave }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const addField = () => {
    const newField: CardFieldSchema = {
      key: `campo_${Date.now()}`,
      label: "",
      type: "text",
      required: false,
      placeholder: "",
    }
    onChange([...fields, newField])
    setExpandedIndex(fields.length)
  }

  const updateField = (index: number, patch: Partial<CardFieldSchema>) => {
    const updated = [...fields]
    updated[index] = { ...updated[index], ...patch }

    // Auto-generate key from label if user is typing the label and key is still auto-generated
    if (patch.label !== undefined) {
      const currentKey = updated[index].key
      if (currentKey.startsWith("campo_") || !currentKey) {
        updated[index].key = toSnakeCase(patch.label) || `campo_${Date.now()}`
      }
    }

    onChange(updated)
  }

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index))
    if (expandedIndex === index) setExpandedIndex(null)
  }

  const moveField = (from: number, to: number) => {
    if (to < 0 || to >= fields.length) return
    const updated = [...fields]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    onChange(updated)
    if (expandedIndex === from) setExpandedIndex(to)
  }

  const updateOptions = (index: number, optionsStr: string) => {
    const options = optionsStr.split(",").map(s => s.trim()).filter(Boolean)
    updateField(index, { options })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Campos Personalizados</h4>
          <p className="text-[10px] text-muted-foreground">Campos extras que aparecem nos cards de negocio deste pipeline</p>
        </div>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addField}>
          <Plus className="h-3 w-3" /> Novo Campo
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-8 text-center">
          <Type className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">Nenhum campo personalizado</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Clique em "Novo Campo" para adicionar</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {fields.map((field, i) => {
            const typeInfo = FIELD_TYPES.find(t => t.value === field.type) || FIELD_TYPES[0]
            const TypeIcon = typeInfo.icon
            const isExpanded = expandedIndex === i

            return (
              <div key={field.key + i} className="border border-border rounded-md bg-card overflow-hidden">
                {/* Collapsed row */}
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveField(i, i - 1) }}
                      className="text-muted-foreground/40 hover:text-muted-foreground h-2.5 leading-none text-[8px]"
                      disabled={i === 0}
                    >
                      ▲
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveField(i, i + 1) }}
                      className="text-muted-foreground/40 hover:text-muted-foreground h-2.5 leading-none text-[8px]"
                      disabled={i === fields.length - 1}
                    >
                      ▼
                    </button>
                  </div>
                  <TypeIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium text-foreground flex-1 truncate">
                    {field.label || <span className="text-muted-foreground italic">Sem nome</span>}
                  </span>
                  <Badge variant="secondary" className="text-[9px] shrink-0">{typeInfo.label}</Badge>
                  {field.required && <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-500/30 shrink-0">Obrigatorio</Badge>}
                  <code className="text-[9px] text-muted-foreground font-mono shrink-0 max-w-[80px] truncate">{field.key}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => { e.stopPropagation(); removeField(i) }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3 bg-muted/20">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Nome do campo *</Label>
                        <Input
                          value={field.label}
                          onChange={e => updateField(i, { label: e.target.value })}
                          placeholder="Ex: Orcamento"
                          className="h-8 text-xs"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Chave (auto)</Label>
                        <Input
                          value={field.key}
                          onChange={e => updateField(i, { key: toSnakeCase(e.target.value) })}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Tipo</Label>
                        <Select value={field.type} onValueChange={v => updateField(i, { type: v as CardFieldType })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value} className="text-xs">
                                <span className="flex items-center gap-1.5"><t.icon className="h-3 w-3" />{t.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Placeholder</Label>
                        <Input
                          value={field.placeholder || ""}
                          onChange={e => updateField(i, { placeholder: e.target.value })}
                          placeholder="Texto de ajuda..."
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    {field.type === "select" && (
                      <div className="space-y-1">
                        <Label className="text-[10px]">Opcoes (separadas por virgula)</Label>
                        <Input
                          value={(field.options || []).join(", ")}
                          onChange={e => updateOptions(i, e.target.value)}
                          placeholder="Opcao 1, Opcao 2, Opcao 3"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={v => updateField(i, { required: v })}
                      />
                      <Label className="text-[10px]">Campo obrigatorio</Label>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {onSave && (
        <div className="flex justify-end pt-2">
          <Button size="sm" className="gap-1 text-xs" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Salvar Campos
          </Button>
        </div>
      )}
    </div>
  )
}
