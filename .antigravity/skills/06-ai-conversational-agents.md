---
name: ai-conversational-agents
description: Regras para chatbots de atendimento externo e copilotos internos.
---
# Diretrizes de IA Conversacional (Whatsflow)
1. **Gestão de Contexto:** O histórico de mensagens (chat) deve ser recuperado do banco (Supabase) ou de um cache rápido (Redis) antes de ser enviado ao LLM, sempre respeitando a janela de contexto máxima do modelo para evitar custos astronômicos.
2. **Human Handoff (Transbordo):** TODO bot de atendimento DEVE possuir um gatilho de segurança (ex: intenção de "falar com humano" ou frustração do usuário) que pause o processamento da IA e notifique o painel (Realtime) para um operador de carne e osso assumir.
3. **RAG (Retrieval-Augmented Generation):** Para bots que respondem dúvidas, a IA deve consultar bases de conhecimento do respectivo Tenant via Embeddings/Vector Database, sendo estritamente proibida de inventar políticas ou preços que não estejam nos documentos.
