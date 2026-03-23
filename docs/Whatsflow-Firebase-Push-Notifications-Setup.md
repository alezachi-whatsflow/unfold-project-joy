# Whatsflow — Configuracao Firebase Push Notifications
## Guia Passo a Passo

---

## Pre-requisitos

- Conta Google (gmail)
- Acesso ao projeto Whatsflow no Supabase
- Acesso ao Railway (variaveis de ambiente)

---

## Passo 1 — Criar Projeto no Firebase

1. Acesse **https://console.firebase.google.com**
2. Faca login com sua conta Google
3. Clique em **"Adicionar projeto"** (ou "Add project")
4. Nome do projeto: **whatsflow-finance**
5. Na tela do Google Analytics: **desmarque** (nao precisa para push notifications)
6. Clique em **"Criar projeto"**
7. Aguarde a criacao (leva alguns segundos)
8. Clique em **"Continuar"** quando finalizar

---

## Passo 2 — Registrar App Web

1. No painel inicial do projeto, clique no icone **Web** (simbolo `</>`)
2. Nome do app: **Whatsflow Web**
3. **NAO** marque a opcao "Firebase Hosting"
4. Clique em **"Registrar app"**
5. Vai aparecer um bloco de codigo com `firebaseConfig`
6. **COPIE e SALVE** os seguintes valores:

```
apiKey: "AIzaSy..."
authDomain: "whatsflow-finance.firebaseapp.com"
projectId: "whatsflow-finance"
storageBucket: "whatsflow-finance.appspot.com"
messagingSenderId: "123456789012"
appId: "1:123456789012:web:abcdef123456"
```

7. Clique em **"Continuar para o console"**

**IMPORTANTE:** Guarde esses 6 valores — serao usados no codigo e no .env

---

## Passo 3 — Gerar VAPID Key (Web Push Certificate)

1. No menu lateral esquerdo do Firebase, clique na **engrenagem** (Configuracoes do projeto)
2. Ou acesse: Configuracoes do projeto > Configuracoes gerais
3. Clique na aba **"Cloud Messaging"**
4. Role a pagina ate a secao **"Web Push certificates"**
5. Clique no botao **"Generate key pair"** (Gerar par de chaves)
6. Vai aparecer uma chave publica longa, tipo:

```
BLn8v2xKhP3s...longa_string...abc123
```

7. **COPIE e SALVE** essa chave — e a VAPID Key

**IMPORTANTE:** Essa chave e usada para autenticar as notificacoes Web Push

---

## Passo 4 — Gerar Service Account Key (Chave Privada)

1. Ainda em **Configuracoes do projeto** (engrenagem)
2. Clique na aba **"Contas de servico"** (Service accounts)
3. Certifique-se de que **"Firebase Admin SDK"** esta selecionado
4. Clique no botao **"Gerar nova chave privada"** (Generate new private key)
5. Confirme clicando em **"Gerar chave"**
6. Um arquivo `.json` sera baixado automaticamente
7. **NAO compartilhe este arquivo publicamente** — contem credenciais sensiveis

O arquivo JSON tera este formato:

```json
{
  "type": "service_account",
  "project_id": "whatsflow-finance",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@whatsflow-finance.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

8. **SALVE este arquivo** em local seguro

---

## Passo 5 — Anotar Todos os Valores

Preencha esta tabela com os valores obtidos:

| Item | Onde Encontrar | Seu Valor |
|------|---------------|-----------|
| **apiKey** | Passo 2 — firebaseConfig | __________________ |
| **authDomain** | Passo 2 — firebaseConfig | __________________ |
| **projectId** | Passo 2 — firebaseConfig | __________________ |
| **storageBucket** | Passo 2 — firebaseConfig | __________________ |
| **messagingSenderId** | Passo 2 — firebaseConfig | __________________ |
| **appId** | Passo 2 — firebaseConfig | __________________ |
| **VAPID Key** | Passo 3 — Cloud Messaging | __________________ |
| **Service Account JSON** | Passo 4 — arquivo .json baixado | (arquivo salvo em: ___) |

---

## Passo 6 — Passar os Valores para Configuracao

Apos preencher a tabela acima, envie os valores para o desenvolvedor (ou Claude) para:

### 6.1 — Adicionar ao .env local

```env
VITE_FIREBASE_API_KEY=seu_valor_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu_valor_aqui
VITE_FIREBASE_PROJECT_ID=seu_valor_aqui
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_valor_aqui
VITE_FIREBASE_APP_ID=seu_valor_aqui
VITE_FIREBASE_VAPID_KEY=seu_valor_aqui
```

### 6.2 — Adicionar ao Railway (Variaveis de Ambiente)

As mesmas 6 variaveis acima devem ser adicionadas no Railway:
1. Acesse https://railway.app
2. Abra o projeto unfold-project-joy
3. Aba Variables
4. Adicione cada uma das 6 variaveis

### 6.3 — Adicionar Service Account ao Supabase Vault

O conteudo do arquivo JSON do Passo 4 sera salvo como secret no Supabase:
1. Acesse o dashboard do Supabase
2. Va em Settings > Vault
3. Adicione um novo secret:
   - Nome: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - Valor: o conteudo completo do arquivo JSON

---

## O Que Sera Implementado com Essas Credenciais

### Notificacoes que o usuario vai receber:

| Evento | Titulo | Quando |
|--------|--------|--------|
| Nova mensagem WhatsApp | "Nova mensagem de {contato}" | Mensagem recebida |
| Lead movido de etapa | "{lead} moveu para {etapa}" | Mudanca no CRM |
| Cobranca paga | "Cobranca recebida — R$ {valor}" | Webhook Asaas confirma |
| Licenca vencendo | "Licenca vence em 7 dias" | 7 dias antes |
| Ticket respondido | "Resposta no ticket #{id}" | Nova resposta Nexus |

### Como funciona:

1. **App aberto** — notificacao aparece como toast dentro do app
2. **App fechado** — notificacao aparece no celular (igual WhatsApp)
3. **Clicar na notificacao** — abre o app na pagina correta
4. **Configuravel** — usuario pode desativar tipos especificos na pagina Perfil

### Compatibilidade:

| Dispositivo | Suporte |
|-------------|---------|
| Android (Chrome) | Sim |
| Android (Firefox) | Sim |
| iOS (Safari 16.4+) | Sim |
| Desktop (Chrome/Edge/Firefox) | Sim |
| iOS antigo (< 16.4) | Nao |

---

## Checklist Final

- [ ] Projeto criado no Firebase Console
- [ ] App Web registrado
- [ ] firebaseConfig copiado (6 valores)
- [ ] VAPID Key gerada e copiada
- [ ] Service Account JSON baixado e salvo
- [ ] Valores enviados para configuracao no codigo
- [ ] Variaveis adicionadas no .env local
- [ ] Variaveis adicionadas no Railway
- [ ] Service Account adicionado ao Supabase Vault
- [ ] Teste: notificacao recebida no celular

---

## Tempo Estimado

- Criar projeto + registrar app: **5 minutos**
- Gerar VAPID key: **2 minutos**
- Gerar Service Account: **2 minutos**
- Configurar variaveis (.env + Railway + Vault): **10 minutos**
- Implementacao no codigo (pelo desenvolvedor): **1-2 horas**
- Teste completo: **15 minutos**

**Total: ~30 minutos do seu lado + implementacao**

---

*Documento gerado em 22/03/2026*
*Whatsflow Finance — Guia Firebase Push Notifications v1.0*
