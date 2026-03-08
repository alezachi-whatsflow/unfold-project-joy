import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useSidebarPrefs } from "@/contexts/SidebarPrefsContext";
import { DEFAULT_NAV_CATEGORIES } from "@/config/navigation";
import { getIcon } from "@/lib/iconMap";
import type { NavItem } from "@/types/sidebar";
import { Search, Clock, Zap, ArrowRight } from "lucide-react";

const RECENT_KEY = "wf_recent_pages";

function getRecentPages(): { route: string; label: string }[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 5);
  } catch { return []; }
}

function addRecentPage(route: string, label: string) {
  try {
    const recent = getRecentPages().filter(r => r.route !== route);
    recent.unshift({ route, label });
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)));
  } catch {}
}

// Quick actions
const QUICK_ACTIONS = [
  { id: 'new-venda', label: 'Nova Venda', route: '/vendas', module: 'vendas' },
  { id: 'new-cobranca', label: 'Nova Cobrança', route: '/cobrancas', module: 'cobrancas' },
  { id: 'new-cliente', label: 'Novo Cliente', route: '/customers', module: 'clientes' },
  { id: 'inserir-dados', label: 'Inserir Dados', route: '/input', module: 'inserir_dados' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { canView } = usePermissions();
  const { prefs } = useSidebarPrefs();

  // All nav items
  const allItems = useMemo(() => {
    const items: (NavItem & { categoryLabel: string })[] = [];
    for (const cat of DEFAULT_NAV_CATEGORIES) {
      for (const item of cat.items) {
        if (canView(item.module)) {
          items.push({ ...item, categoryLabel: cat.label });
        }
      }
    }
    return items;
  }, [canView]);

  // Filtered items
  const filteredNav = useMemo(() => {
    if (!query) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(item =>
      item.label.toLowerCase().includes(q) || item.categoryLabel.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  const filteredActions = useMemo(() => {
    if (!query) return QUICK_ACTIONS.filter(a => canView(a.module));
    const q = query.toLowerCase();
    return QUICK_ACTIONS.filter(a => canView(a.module) && a.label.toLowerCase().includes(q));
  }, [canView, query]);

  const recentPages = useMemo(() => query ? [] : getRecentPages(), [query]);

  // All results flat
  const allResults = useMemo(() => {
    const results: { type: string; label: string; sublabel: string; route: string; icon?: string }[] = [];
    for (const item of filteredNav) {
      results.push({ type: 'nav', label: item.label, sublabel: item.route, route: item.route, icon: item.icon });
    }
    for (const action of filteredActions) {
      results.push({ type: 'action', label: '+ ' + action.label, sublabel: '', route: action.route });
    }
    if (!query) {
      for (const recent of recentPages) {
        results.push({ type: 'recent', label: recent.label, sublabel: recent.route, route: recent.route });
      }
    }
    return results;
  }, [filteredNav, filteredActions, recentPages, query]);

  // Track current page for recents
  useEffect(() => {
    const item = allItems.find(i => i.route === '/' ? location.pathname === '/' : location.pathname.startsWith(i.route));
    if (item) addRecentPage(item.route, item.label);
  }, [location.pathname, allItems]);

  // Keyboard shortcut
  useEffect(() => {
    if (!prefs.keyboardShortcuts) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, prefs.keyboardShortcuts]);

  // G+key shortcuts
  useEffect(() => {
    if (!prefs.keyboardShortcuts) return;
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout>;
    const shortcuts: Record<string, string> = { d: '/', v: '/vendas', c: '/cobrancas', r: '/revenue', f: '/fiscal' };

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        gPressed = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 1000);
        return;
      }
      if (gPressed && shortcuts[e.key]) {
        e.preventDefault();
        gPressed = false;
        navigate(shortcuts[e.key]);
      }
      if (e.key === '[' && !e.metaKey && !e.ctrlKey) {
        // Toggle sidebar collapse
        const evt = new CustomEvent('toggle-sidebar-collapse');
        window.dispatchEvent(evt);
      }
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); clearTimeout(gTimer); };
  }, [navigate, prefs.keyboardShortcuts]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIdx]) {
      e.preventDefault();
      handleSelect(allResults[selectedIdx].route);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-[560px] border-border/50 overflow-hidden" style={{ borderRadius: 14, background: "hsl(var(--popover))" }}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Navegar, buscar ou executar uma ação..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground" style={{ background: "hsl(var(--muted))" }}>Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {allResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum resultado encontrado</p>
          )}

          {/* Nav section */}
          {filteredNav.length > 0 && (
            <div className="mb-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 font-semibold">Navegação</span>
              {filteredNav.map((item, i) => {
                const Icon = getIcon(item.icon);
                const globalIdx = i;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.route)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${globalIdx === selectedIdx ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"}`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.route}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions section */}
          {filteredActions.length > 0 && (
            <div className="mb-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 font-semibold">Ações Rápidas</span>
              {filteredActions.map((action, i) => {
                const globalIdx = filteredNav.length + i;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleSelect(action.route)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${globalIdx === selectedIdx ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"}`}
                  >
                    <Zap className="h-4 w-4 text-primary shrink-0" />
                    <span className="flex-1 text-left">+ {action.label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Recent section */}
          {recentPages.length > 0 && !query && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 font-semibold">Recentes</span>
              {recentPages.map((recent, i) => {
                const globalIdx = filteredNav.length + filteredActions.length + i;
                return (
                  <button
                    key={recent.route + i}
                    onClick={() => handleSelect(recent.route)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${globalIdx === selectedIdx ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"}`}
                  >
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-left">{recent.label}</span>
                    <span className="text-xs text-muted-foreground">{recent.route}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
