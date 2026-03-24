# Playbook — Migração para Servidor Próprio + Multi-Dev
## Whatsflow Finance | Versão 1.0 | 24/03/2026

---

## VISÃO GERAL

**Situação atual:**
- Código: GitHub (alezachi-whatsflow/unfold-project-joy)
- Deploy frontend: Railway (auto-deploy via push no main)
- Backend/DB: Supabase Cloud (jtlrglzcsmqmapizqgzu)
- Dev local: 1 máquina (F:\WFW New) via Claude Code (Antigravity)
- Edge Functions: Supabase Edge (Deno Deploy)

**Situação desejada:**
- Código: GitHub (mesmo repo, ou novo privado)
- Deploy frontend: Servidor próprio (VPS/Cloud)
- Backend/DB: Supabase Cloud (mantém) ou Supabase Self-hosted
- Dev local: 2 máquinas com Claude Code
- Tudo em nuvem, atualizado por ambas as máquinas

---

## ARQUITETURA PROPOSTA

```
┌─────────────┐     ┌─────────────┐
│  Máquina 1  │     │  Máquina 2  │
│  (Dev Local)│     │  (Dev Local) │
│  Claude Code│     │  Claude Code │
└──────┬──────┘     └──────┬──────┘
       │                    │
       │   git push/pull    │
       └────────┬───────────┘
                │
        ┌───────▼───────┐
        │    GitHub      │
        │  (Repo privado)│
        └───────┬───────┘
                │ webhook / CI
        ┌───────▼───────┐
        │   Servidor     │
        │   (VPS Cloud)  │
        │  ┌───────────┐ │
        │  │  Nginx    │ │ ← HTTPS + domínio
        │  │  Node/PM2 │ │ ← Serve o build estático
        │  │  Docker?  │ │ ← Opcional
        │  └───────────┘ │
        └───────┬───────┘
                │
        ┌───────▼───────┐
        │   Supabase     │
        │   (Cloud)      │
        │  DB + Auth +   │
        │  Edge Functions│
        └───────────────┘
```

---

## FASE 1 — PREPARAR O SERVIDOR

### 1.1 Escolher provedor de VPS

| Provedor | Plano recomendado | Custo/mês | Datacenter Brasil |
|----------|-------------------|-----------|-------------------|
| **Hetzner** | CX22 (2vCPU, 4GB) | €4.50 (~R$27) | Não (Alemanha) |
| **DigitalOcean** | Basic 2GB | $12 (~R$70) | Não (NYC/SFO) |
| **Vultr** | Cloud Compute 2GB | $12 (~R$70) | Sim (São Paulo) |
| **Contabo** | VPS S (4vCPU, 8GB) | €6.50 (~R$38) | Sim (São Paulo) |
| **Oracle Cloud** | Free Tier (4 OCPU, 24GB ARM) | **Grátis** | Sim (São Paulo) |
| **AWS Lightsail** | 2GB | $10 (~R$58) | Sim (São Paulo) |

**Recomendação:** Vultr ou Contabo (datacenter São Paulo, boa relação custo/benefício).
Para começar testando: **Oracle Cloud Free Tier** (grátis, São Paulo).

### 1.2 Criar VPS

```bash
# Após criar a VPS, anote:
# - IP público: xxx.xxx.xxx.xxx
# - Usuário: root (ou ubuntu)
# - Chave SSH configurada
```

### 1.3 Configurar servidor (primeira vez)

```bash
# Conectar via SSH
ssh root@SEU_IP

# Atualizar sistema
apt update && apt upgrade -y

# Instalar dependências
apt install -y curl git nginx certbot python3-certbot-nginx ufw

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar PM2 (gerenciador de processos)
npm install -g pm2

# Configurar firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable

# Criar usuário para deploy (não usar root)
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
```

### 1.4 Configurar domínio

```
No painel DNS do seu domínio, adicione:
  A    app.whatsflow.com.br    → SEU_IP_DO_SERVIDOR
  A    api.whatsflow.com.br    → SEU_IP_DO_SERVIDOR  (opcional, para futuro)
```

### 1.5 Configurar Nginx

```bash
# Como root no servidor:
nano /etc/nginx/sites-available/whatsflow
```

Conteúdo:
```nginx
server {
    listen 80;
    server_name app.whatsflow.com.br;

    root /home/deploy/whatsflow/dist;
    index index.html;

    # SPA: todas as rotas vão para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;
}
```

```bash
# Ativar site
ln -s /etc/nginx/sites-available/whatsflow /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# SSL com Let's Encrypt
certbot --nginx -d app.whatsflow.com.br
# Responder: Y para redirect HTTP→HTTPS
```

---

## FASE 2 — CONFIGURAR DEPLOY AUTOMÁTICO

### 2.1 Criar chave SSH de deploy no servidor

```bash
# No servidor, como usuário deploy:
su - deploy
ssh-keygen -t ed25519 -C "deploy@whatsflow"
cat ~/.ssh/id_ed25519.pub
# Copie esta chave pública
```

### 2.2 Adicionar chave no GitHub

1. Vá em **github.com/alezachi-whatsflow/unfold-project-joy**
2. **Settings** → **Deploy keys** → **Add deploy key**
3. Cole a chave pública
4. Marque "Allow write access" (opcional, só para pull é suficiente sem)

### 2.3 Clonar repositório no servidor

```bash
# No servidor, como deploy:
su - deploy
cd ~
git clone git@github.com:alezachi-whatsflow/unfold-project-joy.git whatsflow
cd whatsflow
npm install
```

### 2.4 Criar arquivo .env no servidor

```bash
nano /home/deploy/whatsflow/.env
```

Conteúdo (copie do seu `.env` local):
```env
VITE_SUPABASE_PROJECT_ID="jtlrglzcsmqmapizqgzu"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_Uu5shisvJQ9-QOjjvQ3hqw_RHG5EAbR"
VITE_SUPABASE_URL="https://jtlrglzcsmqmapizqgzu.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGci..."
VITE_APP_URL="https://app.whatsflow.com.br"
VITE_WHATSAPP_SUPPORT_NUMBER="5511954665605"
VITE_META_APP_ID="440046068424112"
VITE_META_WHATSAPP_CONFIG_ID="389404487314896"
VITE_META_INSTAGRAM_CONFIG_ID="816342840311378"
VITE_META_BUSINESS_ID="688498549631942"
```

### 2.5 Criar script de deploy

```bash
nano /home/deploy/deploy.sh
```

Conteúdo:
```bash
#!/bin/bash
set -e

APP_DIR="/home/deploy/whatsflow"
LOG_FILE="/home/deploy/deploy.log"

echo "$(date) — Deploy started" >> $LOG_FILE

cd $APP_DIR

# Pull latest code
git fetch origin main
git reset --hard origin/main

# Install dependencies
npm install --frozen-lockfile 2>/dev/null || npm install

# Build
npm run build

# Restart nginx (não precisa com arquivos estáticos, mas por segurança)
sudo systemctl reload nginx

echo "$(date) — Deploy completed" >> $LOG_FILE
echo "Deploy OK!"
```

```bash
chmod +x /home/deploy/deploy.sh
```

### 2.6 Configurar deploy automático via GitHub Webhook

**Opção A: Script simples com webhook (recomendado para começar)**

```bash
# Instalar webhook listener
npm install -g github-webhook-handler

# Criar listener
nano /home/deploy/webhook-server.js
```

```javascript
const http = require('http');
const { execSync } = require('child_process');
const crypto = require('crypto');

const SECRET = 'GERE_UM_SECRET_FORTE_AQUI'; // ex: openssl rand -hex 32
const PORT = 9000;

http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404);
    return res.end();
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    // Verify signature
    const sig = req.headers['x-hub-signature-256'];
    const hmac = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
    if (sig !== `sha256=${hmac}`) {
      res.writeHead(403);
      return res.end('Invalid signature');
    }

    const payload = JSON.parse(body);
    if (payload.ref === 'refs/heads/main') {
      console.log('Deploying...');
      try {
        execSync('/home/deploy/deploy.sh', { stdio: 'inherit' });
        res.writeHead(200);
        res.end('Deployed!');
      } catch (e) {
        console.error('Deploy failed:', e.message);
        res.writeHead(500);
        res.end('Deploy failed');
      }
    } else {
      res.writeHead(200);
      res.end('Not main branch');
    }
  });
}).listen(PORT, () => console.log(`Webhook listening on :${PORT}`));
```

```bash
# Rodar com PM2
pm2 start /home/deploy/webhook-server.js --name webhook
pm2 save
pm2 startup
```

**No GitHub:**
1. Repo → Settings → Webhooks → Add webhook
2. Payload URL: `http://SEU_IP:9000/deploy`
3. Content type: `application/json`
4. Secret: `GERE_UM_SECRET_FORTE_AQUI` (mesmo do script)
5. Events: "Just the push event"

**Nginx proxy para o webhook (mais seguro):**
```nginx
# Adicionar ao bloco server do Nginx:
location /webhook/deploy {
    proxy_pass http://127.0.0.1:9000/deploy;
    proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
    proxy_set_header Content-Type $content_type;
}
```
Aí o webhook URL fica: `https://app.whatsflow.com.br/webhook/deploy`

**Opção B: GitHub Actions (mais robusto)**

Crie `.github/workflows/deploy-server.yml`:
```yaml
name: Deploy to Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: deploy
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: /home/deploy/deploy.sh
```

Secrets no GitHub:
- `SERVER_HOST`: IP do servidor
- `SERVER_SSH_KEY`: chave SSH privada do servidor

---

## FASE 3 — CONFIGURAR 2 MÁQUINAS DE DESENVOLVIMENTO

### 3.1 Máquina 1 (já configurada)

```
Caminho atual: F:\WFW New
Git remote: origin → github.com/alezachi-whatsflow/unfold-project-joy.git
Claude Code: já instalado e funcionando
```

### 3.2 Máquina 2 (nova)

```bash
# 1. Instalar Git
# Windows: https://git-scm.com/download/win
# Mac: xcode-select --install

# 2. Clonar o repositório
git clone https://github.com/alezachi-whatsflow/unfold-project-joy.git "C:\WFW"
cd "C:\WFW"

# 3. Instalar dependências
npm install

# 4. Copiar o .env (pegar da Máquina 1 ou do servidor)
# Copie o arquivo .env da Máquina 1 para a Máquina 2

# 5. Testar build local
npm run build
npm run dev  # abre em localhost:5173

# 6. Instalar Claude Code (Antigravity)
# Seguir instruções em: https://docs.anthropic.com/claude-code
npm install -g @anthropic-ai/claude-code

# 7. Instalar Supabase CLI
npm install -g supabase

# 8. Fazer login no Supabase CLI
npx supabase login --token sbp_0384a5bef7f7e3b965a4f6b4e381b14019832d15

# 9. Linkar projeto
cd "C:\WFW"
npx supabase link --project-ref jtlrglzcsmqmapizqgzu
```

### 3.3 Regras para trabalhar com 2 máquinas

```
REGRA DE OURO: Sempre fazer git pull antes de começar a trabalhar!

Fluxo de trabalho:
1. git pull origin main          ← SEMPRE primeiro
2. Fazer as alterações
3. git add -A
4. git commit -m "mensagem"
5. git push origin main          ← Deploy automático no servidor
6. Aguardar ~2min para o deploy

Se der conflito:
1. git stash                     ← Salva suas mudanças temporariamente
2. git pull origin main          ← Pega as mudanças do outro dev
3. git stash pop                 ← Aplica suas mudanças de volta
4. Resolver conflitos se houver
5. git add -A && git commit && git push
```

### 3.4 Configurar Claude Code na Máquina 2

O Claude Code usa o diretório `.claude/` no projeto para memória e configurações.
Esse diretório **não é commitado** (está no .gitignore).

Na Máquina 2, o Claude Code vai começar "do zero" em termos de memória,
mas o código do projeto estará sincronizado via Git.

Para transferir memórias do Claude Code:
```bash
# Na Máquina 1:
# Copie a pasta C:\Users\SEU_USER\.claude\projects\f--WFW-New\memory\
# Para a Máquina 2 no caminho equivalente
```

---

## FASE 4 — MIGRAR DO RAILWAY

### 4.1 Antes de desligar o Railway

- [ ] Servidor novo funcionando com domínio e HTTPS
- [ ] Deploy automático funcionando (push → build → online)
- [ ] Testado: login, dashboard, vendas, mensageria
- [ ] DNS propagado (app.whatsflow.com.br → servidor novo)

### 4.2 Atualizar URLs

Quando o novo domínio estiver funcionando, atualize:

**No Supabase Dashboard (Auth):**
- Site URL: `https://app.whatsflow.com.br`
- Redirect URLs: `https://app.whatsflow.com.br/**`

**Nos Supabase Secrets:**
```bash
npx supabase secrets set APP_URL="https://app.whatsflow.com.br"
```

**No .env do servidor e das máquinas locais:**
```env
VITE_APP_URL="https://app.whatsflow.com.br"
```

**No Meta Developers:**
- Domínios do app: adicionar `app.whatsflow.com.br`
- OAuth Redirect URIs: manter o do Supabase (não muda)

### 4.3 Desligar Railway

Só depois de confirmar que tudo funciona no servidor novo:
1. Railway Dashboard → Service → Settings → Delete

---

## FASE 5 — SUPABASE (MANTER CLOUD vs SELF-HOSTED)

### Recomendação: MANTER SUPABASE CLOUD

**Por quê:**
- Edge Functions rodam no Deno Deploy (gerenciado)
- Auth (GoTrue) gerenciado
- Realtime gerenciado
- Backups automáticos
- SSL/TLS gerenciado
- Custo: Free tier generoso (500MB DB, 1GB storage)

**Se quiser self-hosted no futuro:**
- Precisa de Docker no servidor
- Precisa gerenciar: Postgres, GoTrue, PostgREST, Realtime, Storage, Kong
- Complexidade: alta
- Economia: ~$25/mês no plano Pro do Supabase Cloud

**Decisão:** Mantenha Cloud agora. Migre para self-hosted apenas se o custo
do plano Pro (quando necessário) justificar a complexidade.

---

## CHECKLIST FINAL

### Servidor
- [ ] VPS criada e acessível via SSH
- [ ] Node.js 20 instalado
- [ ] Nginx configurado
- [ ] SSL (HTTPS) funcionando
- [ ] Repositório clonado
- [ ] .env configurado
- [ ] Build funciona
- [ ] Deploy automático configurado (webhook ou GitHub Actions)

### Máquina 2
- [ ] Git instalado e configurado
- [ ] Repositório clonado
- [ ] npm install OK
- [ ] .env copiado
- [ ] npm run dev funciona
- [ ] Claude Code instalado
- [ ] Supabase CLI instalado e linkado
- [ ] Consegue fazer push e ver deploy

### DNS e URLs
- [ ] Domínio apontando para o servidor
- [ ] HTTPS funcionando
- [ ] Supabase Auth URLs atualizadas
- [ ] Edge Function secrets atualizados (APP_URL)
- [ ] Meta Developers domínios atualizados

### Testes pós-migração
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Vendas/Pipeline funciona
- [ ] Mensageria (WhatsApp) funciona
- [ ] Inteligência Digital (análise) funciona
- [ ] Convite de usuário (e-mail) funciona
- [ ] Checkout funciona
- [ ] Nexus admin funciona

---

## CUSTOS ESTIMADOS

| Item | Mensal |
|------|--------|
| VPS (Vultr/Contabo São Paulo) | R$ 30-70 |
| Domínio (.com.br) | R$ 3/mês (R$ 40/ano) |
| Supabase Cloud (Free) | R$ 0 |
| Supabase Cloud (Pro, se necessário) | R$ 145 ($25) |
| GitHub (Free, repo privado) | R$ 0 |
| SSL (Let's Encrypt) | R$ 0 |
| SMTP2GO (Free tier) | R$ 0 |
| **Total mínimo** | **~R$ 33/mês** |
| **Total com Supabase Pro** | **~R$ 178/mês** |

vs Railway atual: ~R$ 30-50/mês (sem controle total)

---

## CONTATOS E REFERÊNCIAS

- Supabase Dashboard: https://supabase.com/dashboard/project/jtlrglzcsmqmapizqgzu
- GitHub Repo: https://github.com/alezachi-whatsflow/unfold-project-joy
- Meta Developers: https://developers.facebook.com/apps/440046068424112
- SMTP2GO: https://app.smtp2go.com
- Railway (atual): https://railway.app

---

*Whatsflow Finance — Playbook de Migração v1.0*
*Criado em 24/03/2026*
