# Auditoria de Componentes UI — Whatsflow/IAZIS
## Ícones, Botões, Modais, Menus Contextuais

**Data:** 12 de Abril de 2026
**Versão:** 1.0

---

## 1. ÍCONES

| Item | Valor |
|------|-------|
| Biblioteca | **Lucide React** — exclusiva (zero mistura) |
| Ícones únicos | 198 |
| Arquivos que usam | 314 |
| Tamanho mais usado | `h-4 w-4` (16px) — 657 ocorrências |
| Segundo mais usado | `h-3 w-3` (12px) — 619 ocorrências |
| Peso do traço (strokeWidth) | Sem default global — Lucide usa 2 por padrão |
| Mistura de bibliotecas? | **Não** — 100% Lucide React |

### Distribuição de Tamanhos

| Tamanho | Pixels | Ocorrências | Uso típico |
|---------|--------|-------------|------------|
| h-4 w-4 | 16px | 657 | Sidebar, botões, inline |
| h-3 w-3 | 12px | 619 | Badges, labels, compact |
| h-8 w-8 | 32px | 236 | Avatares, empty states |
| h-7 w-7 | 28px | 149 | Cards de feature |
| h-5 w-5 | 20px | 143 | Headers, KPIs |
| h-6 w-6 | 24px | 103 | Ícones de canal |
| h-9 w-9 | 36px | 111 | Cards grandes |
| h-2 w-2 | 8px | 77 | Dots de status |
| h-10 w-10 | 40px | 42 | Ícones decorativos |

### StrokeWidth Variações Encontradas

| Valor | Onde |
|-------|------|
| 2 (default Lucide) | Maioria dos componentes |
| 1.5 | Ícones customizados pontuais |
| 1.8 | SVGs específicos |
| 6 | Indicadores de progresso |

### Lista Completa de Ícones (198 únicos)

Activity, AlertCircle, AlertTriangle, Archive, ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowRightLeft, ArrowUp, Ban, BarChart3, Bell, BellRing, BookOpen, Bot, Brain, Briefcase, Building, Building2, Calculator, Calendar, CalendarClock, CalendarDays, CalendarIcon, CalendarRange, Camera, Check, CheckCheck, CheckCircle, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Circle, CircleDot, ClipboardList, Clock, Columns2, Construction, Contact, Copy, Cpu, CreditCard, Database, DollarSign, Dot, Download, Edit, Edit2, ExternalLink, Eye, EyeOff, Facebook, FileDown, FileKey, FileSpreadsheet, FileText, Filter, Flag, Flame, FlaskConical, Gauge, GitBranch, Globe, GripVertical, Hand, Hash, Headphones, Heart, HelpCircle, History, Home, Image, Info, Instagram, Kanban, KeyRound, Landmark, Layers, LayoutDashboard, LayoutGrid, LifeBuoy, Lightbulb, LineChart, Link2, Linkedin, List, ListOrdered, Loader2, Lock, LockKeyhole, LogOut, Mail, MapPin, Megaphone, Menu, MessageCircle, MessageCircleX, MessageSquare, MessageSquarePlus, MessageSquareText, Mic, Minimize2, Minus, Monitor, MonitorPlay, Moon, MoreHorizontal, MoreVertical, MousePointerClick, Package, Paintbrush, Palette, PanelLeft, PanelRightClose, PanelRightOpen, PartyPopper, Pause, PenLine, Pencil, Percent, Phone, PieChart, Pin, PinOff, Play, PlayCircle, Plug, Plus, Power, Printer, Puzzle, QrCode, Radar, Receipt, RefreshCcw, RefreshCw, Repeat, Rocket, RotateCcw, Rss, Save, ScrollText, Search, Send, Server, Settings, Settings2, Shield, ShieldAlert, ShieldCheck, ShoppingBag, Sliders, SlidersHorizontal, Smartphone, Snowflake, Sparkles, Star, StickyNote, Sun, Tag, Target, Thermometer, ThumbsDown, ThumbsUp, Ticket, ToggleLeft, Trash2, TrendingDown, TrendingUp, Trophy, Type, Unplug, Upload, User, UserCheck, UserMinus, UserPlus, UserX, Users, Users2, UsersRound, Video, Wallet, Wand2, Webhook, Weight, Wifi, WifiOff, X, XCircle, Zap, ZapOff

---

## 2. BOTÕES

### Arquivo: `src/components/ui/button.tsx`
### Pattern: CVA (Class Variance Authority)
### Importado em: 192 arquivos

### 6 Variantes

| Variante | Background | Texto | Hover | Sombra |
|----------|-----------|-------|-------|--------|
| **default** (primário) | `bg-primary` | `text-primary-foreground` | `bg-primary/85` | Sim (elevação) |
| **destructive** | `bg-destructive` | `text-destructive-foreground` | `bg-destructive/85` | Sim |
| **outline** | `bg-card` + border | `text-foreground` | `bg-muted` | Não (shadow-none) |
| **secondary** | `bg-secondary` | `text-secondary-foreground` | `bg-secondary/80` | Não |
| **ghost** | transparent | herda | `bg-muted` | Não |
| **link** | transparent | `text-primary` + underline | underline visible | Não |

### 4 Tamanhos

| Size | Altura | Padding | Uso |
|------|--------|---------|-----|
| **default** | h-10 (40px) | px-5 py-2 | Botões principais |
| **sm** | h-9 (36px) | px-4, text-xs | Ações secundárias |
| **lg** | h-11 (44px) | px-8 | CTAs de destaque |
| **icon** | h-10 w-10 (40×40) | — | Ícone sem texto |

### Propriedades Visuais

| Propriedade | Valor |
|-------------|-------|
| Border-radius | `var(--radius)` = **0.375rem (6px)** |
| Sombra default | `0 4px 6px rgba(50,50,93,.1), 0 1px 3px rgba(0,0,0,.08)` |
| Sombra hover | `0 7px 14px rgba(50,50,93,.1), 0 3px 6px rgba(0,0,0,.08)` |
| Hover transform | `-translate-y-px` (sobe 1px) |
| Active transform | `translate-y-0` (volta ao lugar) |
| Transition | `all 0.15s ease` |
| Focus | `ring-2 ring-ring ring-offset-2` |
| Disabled | `opacity-50 pointer-events-none` |

### Classes Base (todas as variantes)

```
inline-flex items-center justify-center gap-2 whitespace-nowrap
text-sm font-medium transition-all
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
disabled:pointer-events-none disabled:opacity-50
[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0
```

---

## 3. MODAIS / POPUPS

### Componente Base: `src/components/ui/dialog.tsx`
### Wrapper: `@radix-ui/react-dialog` (shadcn)
### Usado por: 33 modais identificados na plataforma

### Comparação Dialog vs Sheet

| Propriedade | Dialog (Modal) | Sheet (Drawer) |
|-------------|----------------|----------------|
| Base Radix | `@radix-ui/react-dialog` | `@radix-ui/react-dialog` |
| Posição | Centralizado (50%/50%) | Side (left/right/top/bottom) |
| Largura | `max-w-lg` (512px) | `w-3/4` (75%) ou custom |
| Border-radius | `var(--radius)` (6px) | Depende do side |
| Sombra | Nenhuma explícita (via border) | Nenhuma explícita |
| Overlay cor | `rgba(var(--glass-overlay-rgb), 0.65)` | `rgba(var(--glass-overlay-rgb), 0.50)` |
| Overlay opacity | **65%** | **50%** |
| Backdrop blur | `backdrop-blur-[2px]` | `backdrop-blur-[2px]` |
| Click outside | Fecha (Radix default) | Fecha |
| Animação entrada | `fade-in-0 + zoom-in-95` | `fade-in-0 + slide-in` |
| Animação saída | `fade-out-0 + zoom-out-95` | `fade-out-0 + slide-out` |
| Close button | X no canto superior direito | X no canto |

### Overlay (glass-overlay-rgb por tema)

| Tema | RGB | Resultado visual |
|------|-----|-----------------|
| Café Noturno | `0, 0, 0` | Preto semi-transparente |
| Pacífico | `44, 62, 48` | Verde-escuro semi-transparente |
| Cosmos | `0, 0, 0` | Preto semi-transparente |

### Dialog Content Classes

```
fixed left-[50%] top-[50%] z-50
grid w-[95vw] max-w-lg
translate-x-[-50%] translate-y-[-50%]
gap-4 border bg-popover p-4 sm:p-6
duration-200
```

### Exceções (componentes custom)

| Componente | Motivo | Diferenças |
|-----------|--------|------------|
| GlobalInternalChatDrawer | Chat interno precisa de comportamento especial | HTML/CSS custom, não usa Sheet |

---

## 4. MENUS CONTEXTUAIS

### Todos shadcn/Radix — Zero componentes custom para menus

| Componente | Wrapper Radix | Border-radius | Animação | Largura |
|-----------|---------------|---------------|----------|---------|
| **DropdownMenu** | `@radix-ui/react-dropdown-menu` | `rounded-sm` (~2px) | fade + zoom | auto |
| **Tooltip** | `@radix-ui/react-tooltip` | default (6px) | fade + zoom + slide | auto |
| **Popover** | `@radix-ui/react-popover` | default (6px) | fade + zoom + slide | `w-72` (288px) |
| **ContextMenu** | `@radix-ui/react-context-menu` | `rounded-sm` (~2px) | fade + zoom | auto |
| **Select** | `@radix-ui/react-select` | default (6px) | fade + zoom | `min-w-[8rem]` |

### Propriedades Compartilhadas (todos os menus)

| Propriedade | Valor |
|-------------|-------|
| Background | `bg-popover` (theme-aware) |
| Texto | `text-popover-foreground` |
| Border | `border` (1px solid hsl(var(--border))) |
| Sombra | `shadow-md` |
| Z-index | `z-50` |
| Overflow | `overflow-hidden` |
| Item hover | `bg-accent text-accent-foreground` |
| Item disabled | `opacity-50 pointer-events-none` |
| Separador | `bg-muted` (h-px) |
| Ícone check | Lucide `Check` (h-4 w-4) |
| Ícone submenu | Lucide `ChevronRight` (h-4 w-4) |

### Tooltip Específico

| Propriedade | Valor |
|-------------|-------|
| sideOffset | 4px (default) |
| Background | `bg-primary` |
| Texto | `text-primary-foreground` |
| Font size | `text-xs` |
| Padding | `px-3 py-1.5` |

---

## 5. SELECT / COMBOBOX

### Select Padrão: `src/components/ui/select.tsx` (shadcn)

| Propriedade | Valor |
|-------------|-------|
| Trigger | `h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm` |
| Content | `min-w-[8rem] overflow-hidden border bg-popover` |
| Item | `py-1.5 pl-8 pr-2 text-sm cursor-default` |
| Item selecionado | Check icon (h-4 w-4) à esquerda |
| Scroll buttons | ChevronUp / ChevronDown |

### SmartCombobox Custom: `src/components/expenses/SmartCombobox.tsx`

| Propriedade | Valor |
|-------------|-------|
| Tipo | **Custom** (não usa shadcn) |
| Input | `h-8 text-xs rounded-md border` |
| Dropdown | `rounded-lg border border-border bg-popover shadow-lg` |
| Max height | `h-48` (192px) com `overflow-y-auto` |
| Busca | Type-ahead com filtro em tempo real |
| Criação inline | Enter cria novo item (ícone Plus) |
| Item selecionado | Check icon (h-3 w-3) verde |
| Color indicator | Dot colorido opcional por opção |

### Onde é usado o SmartCombobox

| Contexto | Campo |
|----------|-------|
| ModalNovaDespesa | Fornecedor (com criação inline) |
| ModalNovaDespesa | Categoria (com criação inline) |

---

## RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| Biblioteca de ícones | Lucide React (exclusiva) |
| Ícones únicos | 198 |
| Tamanho padrão | 16px (h-4 w-4) |
| Variantes de botão | 6 |
| Tamanhos de botão | 4 |
| Border-radius global | 6px (var(--radius)) |
| Modais (shadcn Dialog) | 33 |
| Drawers (shadcn Sheet) | 4 |
| Overlay opacity | 65% (Dialog) / 50% (Sheet) |
| Backdrop blur | 2px |
| Menus contextuais | 5 tipos (todos shadcn/Radix) |
| Componentes custom | 2 (SmartCombobox, GlobalInternalChatDrawer) |

---

*IAZIS — Ambient Intelligence*
*UI Component Audit v1.0 · Abril 2026*
