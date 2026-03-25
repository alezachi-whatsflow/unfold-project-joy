# PROMPT — Sistema de Temas de Aparência (Whatsflow)
> Claude Code | 3 Fases + Teste + Deploy + Merge

---

## CONTEXTO GERAL

Estamos implementando um **sistema de 3 temas visuais** no Whatsflow Finance.
Os temas foram projetados com base em pesquisa oftalmológica e UX para uso prolongado.
A seleção do tema deve persistir por usuário no Supabase e ser aplicada globalmente via CSS variables.

**Temas:**
- `cafe-noturno` — Warm dark, âmbar, oftalmológico (uso intenso)
- `pacifico` — Light warm, verde, para ambientes iluminados
- `cosmos` — Deep navy, azul gelo, power user técnico

---

## FASE 1 — Design Tokens + Hook de Tema

> Objetivo: Criar a fundação CSS e o hook React do sistema de temas, sem alterar nenhuma tela ainda.

### 1.1 — Arquivo de tokens CSS

Crie o arquivo `src/styles/themes.css` com o seguinte conteúdo:

```css
/* ═══════════════════════════════════════════
   WHATSFLOW — SISTEMA DE TEMAS
   Base científica: redução de fadiga visual
   (American Academy of Ophthalmology, 2025)
═══════════════════════════════════════════ */

/* ── TEMA 1: CAFÉ NOTURNO (padrão) ─────────
   Warm dark · Âmbar · Uso prolongado
   Elimina comprimentos de onda azuis
   Reduz luminância total e halos
────────────────────────────────────────── */
[data-theme="cafe-noturno"] {
  --bg-base:        #18140f;
  --bg-surface:     #211b14;
  --bg-card:        #2c2318;
  --bg-active:      #1e190f;
  --bg-hover:       #261e14;
  --bg-input:       #2c2318;

  --border-soft:    #3a2f2222;
  --border:         #3a2f22;
  --border-strong:  #4a3c2c;

  --acc:            #e8a84a;
  --acc-bg:         #e8a84a1a;
  --acc-border:     #e8a84a30;
  --acc-dark:       #b07a20;

  --text-primary:   #f5ede0;
  --text-secondary: #b09880;
  --text-muted:     #7a6a58;

  --unread-bg:      #e8a84a;
  --unread-text:    #18140f;

  --sent-bg:        #261e13;
  --sent-border:    #3a2f22;

  --tag-bg:         #e8a84a1a;
  --tag-text:       #e8a84a;

  --logo-accent:    #e8a84a;

  --danger:         #e85454;
  --success:        #4caf7d;
  --warning:        #e8a84a;

  --scrollbar:      #3a2f22;
  --shadow:         0 2px 12px #00000060;
}

/* ── TEMA 2: PACÍFICO ───────────────────────
   Light warm · Verde · Ambientes iluminados
   Off-white quente elimina glare de branco puro
   Recomendado: salas com luz natural intensa
────────────────────────────────────────── */
[data-theme="pacifico"] {
  --bg-base:        #f5f2ed;
  --bg-surface:     #faf8f5;
  --bg-card:        #edeae4;
  --bg-active:      #e8f4ef;
  --bg-hover:       #eeece8;
  --bg-input:       #edeae4;

  --border-soft:    #d8d2c822;
  --border:         #d8d2c8;
  --border-strong:  #c8c0b4;

  --acc:            #0e8a5c;
  --acc-bg:         #0e8a5c15;
  --acc-border:     #0e8a5c28;
  --acc-dark:       #0a6844;

  --text-primary:   #2a2520;
  --text-secondary: #7a6e62;
  --text-muted:     #b0a494;

  --unread-bg:      #0e8a5c;
  --unread-text:    #ffffff;

  --sent-bg:        #e0f4ec;
  --sent-border:    #b4dfc8;

  --tag-bg:         #0e8a5c18;
  --tag-text:       #0a6844;

  --logo-accent:    #0e8a5c;

  --danger:         #d63031;
  --success:        #0e8a5c;
  --warning:        #e17055;

  --scrollbar:      #d8d2c8;
  --shadow:         0 2px 12px #00000015;
}

/* ── TEMA 3: COSMOS ─────────────────────────
   Deep navy · Azul gelo · Power user técnico
   Contraste alto sem extremos de luminância
   Ideal para dashboards e análise de dados
────────────────────────────────────────── */
[data-theme="cosmos"] {
  --bg-base:        #06080f;
  --bg-surface:     #0a0e1a;
  --bg-card:        #111828;
  --bg-active:      #0d1830;
  --bg-hover:       #0f1525;
  --bg-input:       #111828;

  --border-soft:    #1a254022;
  --border:         #1a2540;
  --border-strong:  #243254;

  --acc:            #5b9ef7;
  --acc-bg:         #5b9ef718;
  --acc-border:     #5b9ef730;
  --acc-dark:       #2e72cc;

  --text-primary:   #dce8ff;
  --text-secondary: #7a9cc8;
  --text-muted:     #3a5278;

  --unread-bg:      #5b9ef7;
  --unread-text:    #06080f;

  --sent-bg:        #0d1830;
  --sent-border:    #1a2540;

  --tag-bg:         #5b9ef718;
  --tag-text:       #5b9ef7;

  --logo-accent:    #5b9ef7;

  --danger:         #ff6b6b;
  --success:        #51cf66;
  --warning:        #fcc419;

  --scrollbar:      #1a2540;
  --shadow:         0 2px 16px #00000080;
}
```

### 1.2 — Hook `useTheme`

Crie o arquivo `src/hooks/useTheme.ts`:

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ThemeId = 'cafe-noturno' | 'pacifico' | 'cosmos';

const THEME_KEY = 'wf_theme';
const DEFAULT_THEME: ThemeId = 'cafe-noturno';

export function useTheme() {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return (localStorage.getItem(THEME_KEY) as ThemeId) || DEFAULT_THEME;
  });
  const [loading, setLoading] = useState(false);

  // Aplica o tema no <html> imediatamente
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Carrega tema salvo no Supabase ao logar
  useEffect(() => {
    if (!user) return;
    async function loadTheme() {
      const { data } = await supabase
        .from('user_preferences')
        .select('theme')
        .eq('user_id', user.id)
        .single();
      if (data?.theme) {
        setThemeState(data.theme as ThemeId);
        localStorage.setItem(THEME_KEY, data.theme);
      }
    }
    loadTheme();
  }, [user]);

  const setTheme = async (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    if (user) {
      setLoading(true);
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, theme: newTheme }, { onConflict: 'user_id' });
      setLoading(false);
    }
  };

  return { theme, setTheme, loading };
}
```

### 1.3 — Supabase: coluna de preferência

Execute no SQL Editor do Supabase:

```sql
-- Adiciona coluna theme na tabela user_preferences (cria se não existir)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'cafe-noturno',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Se a tabela `user_preferences` já existir, apenas adicione a coluna:
```sql
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'cafe-noturno';
```

### 1.4 — Importar CSS no entry point

Em `src/main.tsx` ou `src/index.css`, adicione a importação:
```typescript
import '@/styles/themes.css';
```

Certifique-se de que o `<html>` parte com `data-theme="cafe-noturno"` por padrão.
Se necessário, adicione no `index.html`:
```html
<html lang="pt-BR" data-theme="cafe-noturno">
```

---

### ✅ CRITÉRIOS DE TESTE — FASE 1

Antes de avançar para a Fase 2, confirme:
- [ ] O arquivo `themes.css` existe em `src/styles/`
- [ ] Ao mudar o `data-theme` no HTML via DevTools, as CSS variables mudam
- [ ] O hook `useTheme` exporta `theme`, `setTheme` e `loading` sem erros de TypeScript
- [ ] A tabela `user_preferences` existe no Supabase com a coluna `theme`
- [ ] Não há quebra de build — rode `npm run build` sem erros

**Aguarde confirmação antes da Fase 2.**

---

## FASE 2 — Componente de Seleção de Tema + Integração Global

> Objetivo: Criar o componente visual de seleção de tema e conectá-lo ao layout principal.

### 2.1 — Componente `ThemeSelector`

Crie `src/components/ui/ThemeSelector.tsx`:

```typescript
import { useTheme, ThemeId } from '@/hooks/useTheme';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const THEMES: {
  id: ThemeId;
  name: string;
  description: string;
  dot: string;
  badge: string;
  badgeStyle: string;
}[] = [
  {
    id: 'cafe-noturno',
    name: 'Café Noturno',
    description: 'Âmbar quente · Uso prolongado',
    dot: '#e8a84a',
    badge: '👁 Oftalmológico',
    badgeStyle: 'bg-amber-900/40 text-amber-400 border border-amber-800/50',
  },
  {
    id: 'pacifico',
    name: 'Pacífico',
    description: 'Verde natural · Ambientes claros',
    dot: '#0e8a5c',
    badge: '☀️ Diurno',
    badgeStyle: 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40',
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    description: 'Azul profundo · Power user',
    dot: '#5b9ef7',
    badge: '⚡ Técnico',
    badgeStyle: 'bg-blue-900/30 text-blue-400 border border-blue-800/40',
  },
];

interface ThemeSelectorProps {
  compact?: boolean; // true = exibe inline na sidebar; false = painel completo
}

export function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { theme, setTheme, loading } = useTheme();

  if (compact) {
    return (
      <div className="flex flex-col gap-1 px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}>
          Aparência
        </span>
        <div className="flex gap-1.5">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={t.name}
              className={cn(
                'w-5 h-5 rounded-full border-2 transition-all duration-200',
                theme === t.id ? 'scale-110 border-white/60' : 'border-transparent opacity-50 hover:opacity-80'
              )}
              style={{ background: t.dot }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: 'var(--text-muted)' }}>
        Aparência
      </p>
      <div className="flex flex-col gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            disabled={loading}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg w-full text-left transition-all duration-200',
              theme === t.id
                ? 'ring-1'
                : 'opacity-70 hover:opacity-100'
            )}
            style={{
              background: theme === t.id ? 'var(--acc-bg)' : 'var(--bg-surface)',
              border: `1px solid ${theme === t.id ? 'var(--acc-border)' : 'var(--border)'}`,
              ['--tw-ring-color' as string]: 'var(--acc)',
            }}
          >
            {/* Dot de cor */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: t.dot, boxShadow: theme === t.id ? `0 0 8px ${t.dot}80` : 'none' }}
            />
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-500" style={{ color: 'var(--text-primary)' }}>
                  {t.name}
                </span>
                {theme === t.id && (
                  <Check size={12} style={{ color: 'var(--acc)' }} />
                )}
              </div>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {t.description}
              </span>
            </div>
            {/* Badge */}
            <span className={cn('text-[9px] font-semibold px-2 py-0.5 rounded-full', t.badgeStyle)}>
              {t.badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 2.2 — Conectar ao Layout Principal

No componente de layout principal (`src/components/layout/AppLayout.tsx` ou similar), envolva o `<html>` com o provider do tema.

No `App.tsx` ou `main.tsx`, adicione no início para garantir que o tema carrega antes do primeiro render:

```typescript
// Aplica tema salvo antes do React montar (evita flash)
const savedTheme = localStorage.getItem('wf_theme') || 'cafe-noturno';
document.documentElement.setAttribute('data-theme', savedTheme);
```

### 2.3 — Adicionar à Sidebar de Configurações

Localize o componente da sidebar de Configurações (onde estão Integrações, Atendentes, etc.) e adicione o `ThemeSelector` no rodapé:

```typescript
import { ThemeSelector } from '@/components/ui/ThemeSelector';

// No rodapé da sidebar, antes do botão de perfil/logout:
<div className="mt-auto border-t pt-3" style={{ borderColor: 'var(--border)' }}>
  <ThemeSelector compact={false} />
</div>
```

### 2.4 — Converter variáveis CSS no AppLayout

No arquivo de layout principal, substitua as classes Tailwind hardcoded de cores por CSS variables. Padrão de substituição:

```
bg-[#0d1117]     →  style={{ background: 'var(--bg-base)' }}
bg-[#161b22]     →  style={{ background: 'var(--bg-surface)' }}
bg-[#1c2333]     →  style={{ background: 'var(--bg-card)' }}
border-[#1c2333] →  style={{ borderColor: 'var(--border)' }}
text-[#e6edf3]   →  style={{ color: 'var(--text-primary)' }}
text-[#8b949e]   →  style={{ color: 'var(--text-secondary)' }}
text-[#484f58]   →  style={{ color: 'var(--text-muted)' }}
```

Foque apenas no AppLayout nesta fase. As telas internas serão migradas na Fase 3.

---

### ✅ CRITÉRIOS DE TESTE — FASE 2

- [ ] O componente `ThemeSelector` renderiza os 3 temas na sidebar
- [ ] Clicar em um tema muda visualmente o layout imediatamente (sem reload)
- [ ] Ao recarregar a página, o tema selecionado persiste (localStorage)
- [ ] Ao logar com usuário diferente, carrega o tema salvo desse usuário no Supabase
- [ ] Não há flash de tema errado ao carregar a página
- [ ] O seletor compacto (`compact={true}`) funciona corretamente com os 3 dots

**Aguarde confirmação antes da Fase 3.**

---

## FASE 3 — Migração da Tela de Mensageria + Caixa de Entrada

> Objetivo: Aplicar as CSS variables na tela de Mensageria completa (a tela de maior uso do sistema).

### 3.1 — Padrão de migração

Para cada elemento visual na tela de Mensageria, aplique o seguinte mapeamento:

**Backgrounds:**
```
Fundo principal da tela     → var(--bg-base)
Sidebar / painéis           → var(--bg-surface)
Cards / inputs / hover      → var(--bg-card)
Item ativo/selecionado      → var(--bg-active)
Hover de itens de lista     → var(--bg-hover)
```

**Texto:**
```
Títulos e nomes             → var(--text-primary)
Descrições e previews       → var(--text-secondary)
Timestamps e labels fracos  → var(--text-muted)
```

**Bordas:**
```
Divisores principais        → var(--border)
Divisores sutis             → var(--border-soft)
Bordas de destaque          → var(--border-strong)
```

**Elementos de marca:**
```
Botões primários (bg)       → var(--acc-bg)
Botões primários (borda)    → var(--acc-border)
Botões primários (texto)    → var(--acc)
Badges de notificação       → var(--unread-bg) + var(--unread-text)
Tags e labels de tipo       → var(--tag-bg) + var(--tag-text)
```

**Bolhas de mensagem:**
```
Mensagens enviadas (bg)     → var(--sent-bg)
Mensagens enviadas (borda)  → var(--sent-border)
Mensagens recebidas (bg)    → var(--bg-card)
Mensagens recebidas (borda) → var(--border)
```

### 3.2 — Fundo do chat

**REMOVER completamente** o padrão de ícones/wallpaper do fundo da área de chat. Substituir por:
```
background: var(--bg-base)
```
Esse padrão de fundo causa fadiga visual e distração cognitiva. O fundo deve ser limpo e sólido.

### 3.3 — Abas de filtro

Corrigir a exibição das abas. Em vez de texto colado (`9Minhas`, `31Resolvidas`), aplicar:
```tsx
<button className="tab active">Todas</button>
<button className="tab">
  Minhas
  <span className="badge">9</span>
</button>
```
Com styles:
```
.tab         → padding: 4px 8px; border-radius: 5px; font-size: 11px
.tab.active  → background: var(--acc-bg); color: var(--acc)
.badge       → background: var(--bg-card); color: var(--text-secondary); border-radius: 10px; padding: 1px 5px; font-size: 9px
```

### 3.4 — Header da conversa

Reorganizar a barra de ações do header em grupos hierárquicos:

```
[Badge IA ativa]  |  [Transferir]  [Lead]  |  [Resolver ✓]  |  [···]
```

Usar `var(--border)` como divisor vertical entre grupos.
O botão `Resolver` deve usar `var(--acc-bg)` + `var(--acc)` como cor de destaque primário.

### 3.5 — Estado vazio do chat

Quando nenhuma conversa está selecionada, exibir:
```tsx
<div style={{ background: 'var(--bg-base)' }} className="flex flex-col items-center justify-center gap-3 flex-1">
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    className="w-12 h-12 rounded-xl flex items-center justify-center">
    <Lock size={22} style={{ color: 'var(--text-muted)' }} />
  </div>
  <p style={{ color: 'var(--text-secondary)' }} className="text-sm text-center max-w-[200px]">
    Mensagens protegidas com criptografia de ponta a ponta
  </p>
  <button style={{ background: 'var(--acc-bg)', color: 'var(--acc)', border: '1px solid var(--acc-border)' }}
    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold">
    <Plus size={13} /> Nova Conversa
  </button>
</div>
```

---

### ✅ CRITÉRIOS DE TESTE — FASE 3

- [ ] Alternar entre os 3 temas na Mensageria muda todas as cores corretamente
- [ ] O fundo do chat não tem mais o padrão de ícones
- [ ] As abas `Todas | Minhas (9) | Grupos (3) | Resolvidas (31)` têm badges visíveis e legíveis
- [ ] O header da conversa tem hierarquia clara de ações
- [ ] Mensagens enviadas e recebidas têm distinção visual clara nos 3 temas
- [ ] O estado vazio usa as variáveis corretamente
- [ ] Não há nenhuma cor hardcoded (`#0d1117`, `#1c2333`, etc.) restante no componente de Mensageria

---

## FASE 4 — Deploy, Teste e Merge

> Esta fase só deve ser executada após todos os critérios das fases anteriores estarem ✅.

### 4.1 — Checklist pré-deploy

Antes de fazer o deploy, confirme:
- [ ] `npm run build` finaliza sem erros
- [ ] `npx tsc --noEmit` sem erros TypeScript
- [ ] Os 3 temas funcionam em: Chrome, Firefox e Safari
- [ ] Os 3 temas funcionam em resolução 1280px, 1440px e 1920px
- [ ] O tema persiste após logout/login no Supabase
- [ ] Não há regressão nas outras telas (Leads, Vendas, Cobrança)

### 4.2 — Deploy

```bash
# Commit e push direto na main (Railway auto-deploy):
git add .
git commit -m "feat: sistema de 3 temas de aparência (Café Noturno, Pacífico, Cosmos)"
git push origin main
```

O Railway detecta o push na main e faz deploy automático.
Aguarde o build finalizar sem erros no dashboard do Railway.

### 4.3 — Pós-deploy

Após o deploy, execute no Supabase SQL Editor para garantir que todos os usuários existentes recebem o tema padrão:

```sql
INSERT INTO user_preferences (user_id, theme)
SELECT id, 'cafe-noturno'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_preferences)
ON CONFLICT DO NOTHING;
```

---

## NOTAS IMPORTANTES

1. **Nunca usar cores hardcoded** após a migração. Toda cor deve vir de `var(--nome-da-variavel)`.
2. **O tema `cafe-noturno` é o padrão** — é o mais confortável para atendentes que ficam 6-8h na Caixa de Entrada.
3. **Não alterar a lógica de negócio** — esta feature é 100% visual/CSS. Nenhum componente de dados, hooks de API ou stores deve ser modificado.
4. **Cada fase deve ser commitada separadamente** para facilitar rollback se necessário.
