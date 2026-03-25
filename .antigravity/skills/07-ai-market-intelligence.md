---
name: ai-market-intelligence
description: Regras para crawlers, análise de mercado e geração de insights para os Tenants.
---
# Diretrizes de Inteligência de Mercado (Whatsflow)
1. **Execução Assíncrona:** Tarefas pesadas de Scraping (Firecrawl/Apify) e análise de tendências DEVEM rodar como *Cron Jobs* em background (Edge Functions agendadas ou BullMQ). Nunca segure o frontend esperando o crawler terminar.
2. **Estruturação de Dados:** O output da análise de mercado deve ser armazenado de forma estruturada (JSONB) para alimentar relatórios e dashboards na plataforma.
3. **Zero Fricção:** O usuário final não deve configurar os crawlers. A IA deduz os parâmetros de busca baseada no nicho do Tenant (definido no Onboarding) e entrega o insight mastigado e acionável.
