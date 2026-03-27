import { useSidebarPrefs } from "@/contexts/SidebarPrefsContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Pin, PinOff, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { DEFAULT_NAV_CATEGORIES } from "@/config/navigation";
import { iconMap } from "@/lib/iconMap";
import { useState } from "react";

export function CustomLayoutPanel() {
  const {
    prefs, setPrefs, categories,
    toggleItemVisibility, toggleItemPin, toggleCategoryVisibility,
    updateCategoryCollapsed,
  } = useSidebarPrefs();

  const [expandedCats, setExpandedCats] = useState<string[]>(categories.map(c => c.id));

  const toggleExpand = (id: string) => {
    setExpandedCats(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const pinnedItems = prefs.pinnedItems || [];

  return (
    <div className="space-y-4 border-2 border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold text-foreground">Personalização Avançada</Label>
          <p className="text-xs text-muted-foreground">Gerencie visibilidade, fixação e organização dos itens do menu</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPrefs({ customCategories: undefined, categoryOrganization: 'default', pinnedItems: [] });
          }}
          className="text-xs"
        >
          Resetar
        </Button>
      </div>

      {/* Show Labels toggle */}
      <div className="flex items-center justify-between border border-border p-3">
        <div>
          <p className="text-sm text-foreground">Mostrar labels de categoria</p>
          <p className="text-xs text-muted-foreground">PRINCIPAL, FINANCEIRO, etc.</p>
        </div>
        <Switch checked={prefs.showLabels} onCheckedChange={(v) => setPrefs({ showLabels: v })} />
      </div>

      {/* Quick Actions toggle */}
      <div className="flex items-center justify-between border border-border p-3">
        <div>
          <p className="text-sm text-foreground">Ações rápidas</p>
          <p className="text-xs text-muted-foreground">Chips de atalho no topo do menu</p>
        </div>
        <Switch checked={prefs.showQuickActions} onCheckedChange={(v) => setPrefs({ showQuickActions: v })} />
      </div>

      {/* Pinned Items */}
      {pinnedItems.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Itens fixados ({pinnedItems.length}/5)</Label>
          <div className="flex flex-wrap gap-2">
            {pinnedItems.map(id => {
              const item = categories.flatMap(c => c.items).find(i => i.id === id);
              if (!item) return null;
              const Icon = iconMap[item.icon];
              return (
                <Badge key={id} variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1">
                  {Icon && <Icon className="h-3 w-3" />}
                  <span className="text-xs">{item.label}</span>
                  <button onClick={() => toggleItemPin(id)} className="ml-1 text-muted-foreground hover:text-foreground">
                    <PinOff className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Category & Item Management */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Categorias e Itens</Label>
        <div className="space-y-1">
          {categories.map(cat => {
            const isExpanded = expandedCats.includes(cat.id);
            const catVisible = cat.visible !== false;
            const CatIcon = cat.icon ? iconMap[cat.icon] : null;

            return (
              <div key={cat.id} className="border border-border overflow-hidden">
                {/* Category Header */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30">
                  <button onClick={() => toggleExpand(cat.id)} className="text-muted-foreground hover:text-foreground">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {CatIcon && <CatIcon className="h-4 w-4 text-muted-foreground" />}
                  <span className={`text-sm font-medium flex-1 ${catVisible ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                    {cat.label}
                  </span>
                  <button
                    onClick={() => toggleCategoryVisibility(cat.id)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={catVisible ? 'Ocultar categoria' : 'Mostrar categoria'}
                  >
                    {catVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Items */}
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {cat.items.map(item => {
                      const itemVisible = item.visible !== false;
                      const isPinned = pinnedItems.includes(item.id);
                      const ItemIcon = iconMap[item.icon];
                      const isDashboard = item.id === 'dashboard';

                      return (
                        <div key={item.id} className="flex items-center gap-2 px-3 py-2 pl-10 hover:bg-muted/20 transition-colors">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                          {ItemIcon && <ItemIcon className="h-4 w-4 text-muted-foreground" />}
                          <span className={`text-sm flex-1 ${itemVisible ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1">
                            {/* Pin */}
                            <button
                              onClick={() => toggleItemPin(item.id)}
                              className={`p-1 rounded hover:bg-muted transition-colors ${isPinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                              title={isPinned ? 'Desafixar' : 'Fixar no topo'}
                            >
                              {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                            </button>
                            {/* Visibility */}
                            {!isDashboard && (
                              <button
                                onClick={() => toggleItemVisibility(item.id)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title={itemVisible ? 'Ocultar' : 'Mostrar'}
                              >
                                {itemVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                              </button>
                            )}
                            {isDashboard && (
                              <span className="text-[10px] text-muted-foreground px-1">obrigatório</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
