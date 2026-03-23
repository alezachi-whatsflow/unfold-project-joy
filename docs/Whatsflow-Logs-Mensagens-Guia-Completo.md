# Whatsflow — Logs de Mensagens
## Guia Completo de Funcionamento

---

## O que é?

A área de **Logs** registra **toda mensagem** que entra e sai do sistema — sejam mensagens de WhatsApp recebidas via webhook, ou mensagens enviadas manualmente pela equipe.

É o histórico centralizado de toda a comunicação da sua operação.

---

## Como os dados chegam ali?

Existem **2 fontes** de dados:

### 1. Webhook automático (mensagens recebidas/enviadas pelo WhatsApp)
Quando chega uma mensagem de um cliente via WhatsApp, o webhook (`whatsapp-webhook-receiver`) normaliza a mensagem e insere no banco automaticamente.

**Provedores suportados:**
- Zapi
- UaZAPI
- Evolution API

### 2. Envio manual (equipe envia pelo chat)
Quando alguém da equipe envia uma mensagem pelo painel de atendimento (Caixa de Entrada), o sistema registra automaticamente com `session_id: "manual"`.

---

## Colunas da Tabela

| Coluna | O que mostra | Exemplo |
|--------|-------------|---------|
| **DATA** | Data e hora da mensagem | 22/03/2026 14:32 |
| **SESSÃO** | Qual instância do WhatsApp enviou/recebeu | whatsapp-01, manual |
| **NÚMERO** | Telefone do contato | 5511999887766 |
| **DIR.** | Direção da mensagem | ↑ (enviou) / ↓ (recebeu) |
| **TIPO** | Tipo de mídia da mensagem | text, image, audio, doc |
| **STATUS** | Status de entrega da mensagem | pending, sent, delivered, read, failed |
| **ORIGEM** | De onde veio ou para que finalidade | suporte, prospeccao, cobranca |
| **CONTEÚDO** | Texto da mensagem (truncado na tabela) | Olá, gostaria de saber... |

---

## Significado dos Status

| Status | Significado | Ícone |
|--------|------------|-------|
| **pending** | Mensagem aguardando envio | ⏳ |
| **sent** | Mensagem enviada ao servidor do WhatsApp | ✓ |
| **delivered** | Mensagem entregue no celular do destinatário | ✓✓ |
| **read** | Mensagem lida pelo destinatário | ✓✓ (azul) |
| **failed** | Falha no envio da mensagem | ✗ |

---

## Significado das Direções

| Símbolo | Significado |
|---------|------------|
| **↑** (seta para cima) | Mensagem **enviada** pela sua equipe |
| **↓** (seta para baixo) | Mensagem **recebida** de um cliente |

---

## Significado das Origens

| Origem | Significado |
|--------|------------|
| **suporte** | Mensagem de atendimento ao cliente |
| **prospeccao** | Mensagem de prospecção comercial / vendas |
| **cobranca** | Mensagem de cobrança automática ou manual |

---

## Filtros Disponíveis

### Busca por texto
- Filtra por **número de telefone** OU **conteúdo da mensagem**
- A busca no conteúdo ignora maiúsculas/minúsculas
- Exemplo: digitar "proposta" encontra mensagens com "Proposta enviada"

### Filtro por conexão (Todas conexões)
- Filtra por instância WhatsApp específica
- Útil quando você tem múltiplas linhas/números

### Filtro por status (Todos status)
- pending, sent, delivered, read, failed
- Exemplo: filtrar por "failed" para ver mensagens que falharam

### Filtro por origem (Todas origens)
- suporte, prospeccao, cobranca
- Exemplo: filtrar por "cobranca" para ver apenas cobranças enviadas

**Importante:** Todos os filtros funcionam em **lógica AND** — ou seja, se você selecionar status "read" E origem "suporte", só aparecem mensagens que atendem **ambos** os critérios.

---

## Exportar CSV

O botão **"Exportar CSV"** gera um arquivo Excel/planilha com as mesmas colunas.

**Detalhes:**
- Nome do arquivo: `logs-mensageria-2026-03-22.csv`
- Colunas: Data, Sessão, Número, Direção, Tipo, Status, Origem, Conteúdo
- **Respeita os filtros ativos** — se você filtrou por "cobranca", o CSV exporta apenas cobranças
- Datas formatadas no padrão brasileiro (dd/mm/aaaa hh:mm)

---

## Exemplos Práticos de Uso

### Cenário 1 — "O cliente diz que mandou mensagem e não recebemos"

**Passos:**
1. Abra a aba **Logs**
2. No campo de busca, digite o **número do cliente** (ex: 5511999887766)
3. Se aparecer com `DIR: ↓` (recebido) e `STATUS: delivered` → o sistema recebeu normalmente
4. Se não aparecer nenhum registro → o webhook pode não ter chegado (verificar conexão da instância)

---

### Cenário 2 — "Quero ver se a cobrança automática foi enviada"

**Passos:**
1. Abra a aba **Logs**
2. No filtro de origem, selecione **"cobranca"**
3. No filtro de status, selecione **"sent"** ou **"delivered"**
4. A lista mostrará todas as cobranças disparadas com sucesso
5. Se alguma aparece como **"failed"**, é necessário reenviar manualmente

---

### Cenário 3 — "Uma mensagem falhou, preciso identificar e reenviar"

**Passos:**
1. Abra a aba **Logs**
2. No filtro de status, selecione **"failed"**
3. O log mostra qual **número** e qual **conteúdo** falhou
4. Anote o número e o conteúdo
5. Vá até a **Caixa de Entrada** e reenvie a mensagem manualmente

---

### Cenário 4 — "Preciso de relatório mensal de mensagens"

**Passos:**
1. Abra a aba **Logs**
2. Aplique os filtros desejados (ex: origem "suporte", período do mês)
3. Clique no botão **"Exportar CSV"**
4. Abra o arquivo no **Google Sheets** ou **Excel** para análises
5. Use tabelas dinâmicas para agrupar por dia, status, origem, etc.

---

### Cenário 5 — "Quero saber quantas mensagens uma instância específica enviou"

**Passos:**
1. Abra a aba **Logs**
2. No filtro de conexão, selecione a **instância desejada** (ex: whatsapp-01)
3. O total de registros filtrados aparece na tabela
4. Para detalhamento, clique em **"Exportar CSV"** e analise na planilha

---

### Cenário 6 — "Quero verificar se o cliente leu minha mensagem"

**Passos:**
1. Abra a aba **Logs**
2. Busque pelo **número do cliente**
3. Encontre a mensagem enviada (DIR: ↑)
4. Verifique a coluna **STATUS**:
   - **sent** = enviado, mas ainda não entregue
   - **delivered** = entregue no celular, mas não lido
   - **read** = cliente leu a mensagem

---

## Informações Técnicas

### Tabela no banco de dados
- **Nome:** `message_logs`
- **Campos:** id, session_id, conversa_id, direcao, tipo, conteudo, status, lead_id, origem, timestamp, tenant_id

### Limite de carregamento
- O sistema carrega os **últimos 500 registros** por consulta
- Para históricos maiores, use o **Exportar CSV**

### Tempo real
- A tabela `message_logs` tem **Realtime habilitado** no Supabase
- Novos registros podem ser exibidos automaticamente sem refresh

### Fontes de inserção de dados
1. **Webhook** (`whatsapp-webhook-receiver`) — mensagens automáticas dos provedores
2. **Chat manual** (`ChatArea.tsx`) — mensagens enviadas pela equipe no painel

### Retenção de dados
- Quando uma instância WhatsApp é deletada, os logs dessa sessão são **removidos automaticamente**
- Quando um tenant é excluído, todos os logs são **removidos após 30 dias** (período de graça)

---

## Dúvidas Frequentes

**P: Os logs mostram mensagens de TODOS os números da empresa?**
R: Sim, desde que os números estejam conectados como instâncias no sistema.

**P: Posso ver mensagens de imagem ou áudio?**
R: O log registra o **tipo** (image, audio, doc) mas o conteúdo exibido é apenas texto. Para mídias, o campo conteúdo pode mostrar o nome do arquivo ou estar vazio.

**P: O filtro de busca pesquisa em todo o histórico?**
R: Pesquisa nos últimos 500 registros carregados. Para buscas mais abrangentes, exporte o CSV.

**P: Posso deletar um log específico?**
R: Não. Os logs são registros de auditoria e não podem ser deletados individualmente. Eles são removidos automaticamente quando a instância ou tenant é excluído.

**P: O que significa session_id "manual"?**
R: Significa que a mensagem foi enviada diretamente pelo painel de atendimento (Caixa de Entrada), não por uma instância WhatsApp automatizada.

---

*Documento gerado em 22/03/2026*
*Whatsflow Finance — Guia de Logs de Mensagens v1.0*
