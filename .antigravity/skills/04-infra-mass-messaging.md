---
name: infra-mass-messaging
description: Arquitetura para disparos em massa (10k+), Rate Limits e Gestão de Grupos de WhatsApp.
---
# Diretrizes de Mensageria em Massa e Grupos (Whatsflow)
1. **Chunking e Fatiamento:** Listas de transmissão acima de 1.000 contatos DEVEM ser fatiadas (chunks) e enfileiradas no Redis (BullMQ). Nunca processe um array gigante na memória da API síncrona.
2. **Isolamento de Tenant nas Filas:** O tráfego de campanhas de um Tenant NÃO PODE bloquear mensagens transacionais de outro. Use particionamento de filas (`q_campaign_tenantX`) ou prioridades rígidas.
3. **Gestão de Grupos:** A criação de grupos, adição de membros e envios para grupos possuem Rate Limits severos da Meta/Provedor. Implemente estratégias de aquecimento (warm-up), delay randômico entre adições e filas de contenção.
4. **Dead Letter Queue (DLQ):** Mensagens que falharem por número inválido ou bloqueio de spam devem ir para uma DLQ, atualizando o status do lead no banco (para "bounce/inválido") e interrompendo tentativas futuras para proteger o número remetente.
