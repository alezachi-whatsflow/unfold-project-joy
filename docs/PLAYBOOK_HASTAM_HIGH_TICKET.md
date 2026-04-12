# PLAYBOOK HASTAM — Gestão High-Ticket via Whatsflow
## Veículos de Luxo · Ticket Médio > R$ 500.000

**Versão:** 1.0
**Data:** Abril 2026
**Para:** Gestor Comercial Hastam
**Confidencial**

---

## 1. CONFIGURAÇÃO DE SLAs VIP

### Tempo de Primeira Resposta
- **Meta Luxury:** < 2 minutos (vs. 15min padrão)
- **Como configurar:** Caixa de Entrada → SLA → Nova Regra
  - Nome: "VIP Automotive"
  - Primeira resposta: **2 minutos**
  - Resolução: **4 horas** (não 24h — luxury não espera)
  - Departamento: Vendas (ou "Todos" se equipe pequena)

### Atendimento Simultâneo
- **Regra de ouro:** Concierge luxury atende **máximo 3 conversas** simultâneas
- Mais que 3 = qualidade cai drasticamente para ticket >R$ 500k
- **Como monitorar:** Métricas → "Multitarefas" — se >3, redistribuir leads

### Tags de Prioridade
- Configurar tags automáticas:
  - `🔥 VIP` — leads com interesse declarado em modelos >R$ 500k
  - `🏆 Test Drive Agendado` — confirmou visita/test drive
  - `💎 Retorno` — cliente que já comprou antes
  - `⏰ Follow-up Urgente` — sem resposta há >24h

---

## 2. ROTINA DIÁRIA DO GESTOR NO DASHBOARD

### Manhã (08:00 — 15 minutos)

**1. Métricas → Visão Geral**
- Verificar: Conversas na **Fila** (deve ser ZERO às 08:00)
- Verificar: **Taxa de abandono** das últimas 24h (meta: <5%)
- Verificar: **Tempo médio de primeira resposta** (meta: <2min)

**2. Métricas → Qualidade (AuditorDashboard)**
- Score geral da equipe deve ser ≥8.0
- Identificar atendentes abaixo de 7.0 → feedback imediato
- Verificar "Erros Mais Frequentes" → treinar equipe no ponto fraco

**3. Vendas → Pipeline**
- Negócios parados >7 dias na mesma etapa → cobrar follow-up
- Negócios com `probabilidade >70%` e sem atividade → risco de esfriar

### Fim do dia (18:00 — 10 minutos)

**4. Métricas → Follow-ups**
- Quantos follow-ups foram realizados hoje?
- Meta: cada vendedor faz **mínimo 5 follow-ups/dia**
- Follow-ups que geraram resposta (%) — meta: >30%

**5. Conversas Finalizadas**
- Revisar 2-3 conversas finalizadas do dia (amostra)
- A IA auditou? Score está >8.0?
- Alguma oportunidade perdida sinalizada?

---

## 3. ANÁLISE DE SENTIMENTO E AUDITORIA DE CONCIERGES

### Como a IA Avalia Seus Concierges

A auditoria automática analisa 6 critérios com peso diferenciado:

| Critério | Peso | O que avalia |
|----------|------|-------------|
| Tempo de Resposta | 15% | Respondeu rápido? Sem gaps longos? |
| Qualidade da Resposta | 20% | Respostas completas, precisas, sem erros? |
| Empatia / Rapport | 15% | Chamou pelo nome? Demonstrou interesse genuíno? |
| Técnica de Vendas | 20% | Fez perguntas abertas? Identificou necessidade? |
| Follow-up | 15% | Deixou próximos passos claros? Agendou retorno? |
| Base de Conhecimento | 15% | Demonstrou domínio técnico do veículo? |

### Classificação dos Atendentes

| Score | Classificação | Ação |
|-------|---------------|------|
| 9.0 - 10.0 | **Concierge Elite** | Atribuir leads VIP e test drives |
| 8.0 - 8.9 | **Concierge** | Apto para atendimento luxury |
| 7.0 - 7.9 | **Vendedor** | Precisa de coaching — não atribuir VIP |
| <7.0 | **Em treinamento** | Feedback imediato + acompanhamento |

### Sinais de Alerta Automáticos

A IA detecta automaticamente:
- **Linguagem inadequada:** gírias, abreviações, informalidade excessiva
- **Oportunidade perdida:** cliente mencionou modelo específico e vendedor não explorou
- **Follow-up ausente:** conversa encerrada sem próximo passo definido
- **Pressão excessiva:** tentativa de fechar antes de construir rapport
- **Desconhecimento técnico:** informação incorreta sobre o veículo

### Leitura do Dashboard de Qualidade

**Score Geral (Gauge principal):**
- Verde (≥8.5): Equipe operando no padrão luxury
- Azul (7.0-8.4): Bom, mas há espaço para melhoria
- Amarelo (5.5-6.9): Atenção — qualidade abaixo do esperado
- Vermelho (<5.5): Crítico — intervir imediatamente

**Ranking de Concierges:**
- Os 3 primeiros recebem os leads mais quentes
- O último recebe mentoria do primeiro (shadow)
- Comparar evolução semana a semana

**Critérios de Qualidade (barras):**
- A barra MAIS CURTA é o ponto fraco da equipe
- Focar treinamento nesse critério específico
- Ex: se "Empatia" é a mais baixa → workshop de rapport

---

## 4. USO DO PIPELINE PARA LEADS HIGH-TICKET

### Etapas Recomendadas para Automotive Luxury

| Etapa | Tempo Máximo | Ação Obrigatória |
|-------|-------------|------------------|
| Prospecção | 24h | Primeira resposta + qualificação |
| Qualificação | 48h | Identificar modelo de interesse + budget |
| Apresentação | 3 dias | Enviar proposta personalizada + fotos |
| Test Drive | 5 dias | Agendar e confirmar test drive |
| Negociação | 7 dias | Proposta formal + condições |
| Fechamento | — | Contrato + pagamento |

### Regras de Ouro

1. **Lead parado >3 dias = Follow-up obrigatório**
   - Usar Cadência de Msgs com sequência: Texto → Imagem do veículo → Áudio personalizado

2. **Proposta enviada sem resposta em 48h = Ligação**
   - Registrar atividade "Ligação" no CRM
   - Se não atender: áudio WhatsApp personalizado

3. **Test Drive agendado = Sequência automática**
   - 24h antes: confirmação
   - 2h antes: lembrete + endereço
   - Após: "Como foi a experiência?"

4. **Negócio perdido = Análise obrigatória**
   - IA analisa a conversa inteira
   - Gestor revisa o score de qualidade
   - Identificar: foi preço? Timing? Atendimento? Concorrência?

---

## 5. MÉTRICAS DE SUCESSO (KPIs)

| KPI | Meta Luxury | Frequência |
|-----|------------|------------|
| Tempo primeira resposta | <2 min | Diário |
| Score qualidade equipe | ≥8.5 | Semanal |
| Taxa de conversão | ≥15% | Mensal |
| Follow-ups/dia/vendedor | ≥5 | Diário |
| CSAT (satisfação) | ≥4.5/5 | Semanal |
| Propostas enviadas/semana | ≥10 | Semanal |
| Test drives agendados/semana | ≥5 | Semanal |
| Abandono de conversa | <3% | Diário |
| Negócios parados >7 dias | 0 | Diário |

---

## 6. CHECKLIST DE IMPLANTAÇÃO

```
[ ] SLA VIP configurado (2min resposta, 4h resolução)
[ ] Tags criadas (VIP, Test Drive, Retorno, Follow-up Urgente)
[ ] Pipeline "Vendas Automotive" com 6 etapas configuradas
[ ] Cadência de Follow-up criada (Texto → Imagem → Áudio)
[ ] Cadência Test Drive criada (confirmação → lembrete → pós)
[ ] Equipe treinada no uso do painel de qualidade
[ ] Auditoria automática ativa (amostragem diária)
[ ] CSAT ativo (pesquisa pós-atendimento)
[ ] Dashboard aberto na tela do gestor (monitor dedicado)
[ ] Reunião semanal de review com base nos scores
```

---

*Whatsflow · IAZIS Ambient Intelligence*
*Playbook High-Ticket v1.0 · Abril 2026*
