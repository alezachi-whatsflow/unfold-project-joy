---
name: ai-solution-factory
description: Regras para criação, teste e deploy de novas soluções e prompts de IA.
---
# Diretrizes de Engenharia de IA e Prompts (Whatsflow)
1. **Separação de Contexto:** Prompts não devem ficar *hardcoded* espalhados pelo código. Utilize a tabela `ai_configurations` ou variáveis de ambiente para gerenciar as chaves e IDs de Assistants (OpenAI).
2. **JSON Mode Estrito:** Toda I.A. que interagir diretamente com o banco de dados ou renderizar UI (como o gerador de CRM) DEVE ser forçada a responder em `json_object` com schemas de validação rigorosos (ex: Zod no frontend/backend).
3. **Testabilidade:** Novas features de IA devem ter rotas ou flags de ambiente isoladas (A/B testing) para validação de alucinação e consumo de tokens antes de liberar para o Tenant final.
