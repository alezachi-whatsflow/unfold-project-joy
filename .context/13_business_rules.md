# Regras de Negócio e Lógica Implícita

1. **Digital Intelligence vs Manual**: No CRM `negocios`, leads do tipo `digital_intelligence` possuem tratamentos especiais na UI (scores 0-10 formatados, relatórios automáticos gerados localmente e selo de inteligência).
2. **ICP (Ideal Customer Profile)**: Lead pode ser graduado com scores Quente / Morno / Frio de 0-100 baseados no `questionnaire_answers`. Isso dita a probabilidade do Kanban.
3. **Múltiplos Enums**: Como Formas de Pagamento (Pix, Cartão, Boleto) e Status do negócio (`prospeccao`, `qualificacao`, `proposta`, `apresentacao`, `negociacao`, `fechado_ganho`, `fechado_perdido`).
4. **Fechado Ganho Bloqueio**: Ações e faturamentos fiscais (gerarNF, Cobranca) só abrem flag nativas de verdade se o workflow for movimentado devidamente preenchido e ganho.