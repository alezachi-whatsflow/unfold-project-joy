# ESPECIFICAÇÃO DE INFRAESTRUTURA FÍSICA — SERVIDOR WHATSFLOW

**Empresa:** Whatsflow  
**Data:** 11/03/2026  
**Objetivo:** Dimensionamento de servidor(es) para operação de **50 licenças ativas simultâneas**  
**Cenário:** Servidor dedicado ou VPS para hospedar componentes self-hosted

---

## 1. VISÃO GERAL DA CARGA DE TRABALHO

| Componente | Função | Impacto no servidor |
|------------|--------|---------------------|
| PostgreSQL (Supabase self-hosted) | Banco de dados principal | CPU + RAM + Disco (I/O intensivo) |
| GoTrue (Auth) | Autenticação de usuários | CPU leve, RAM moderada |
| PostgREST | API REST automática | CPU moderada |
| Edge Functions (Deno) | Lógica de negócio serverless | CPU + RAM sob demanda |
| Realtime (Elixir) | WebSockets para 50-100 conexões | RAM + Network |
| Storage (S3-compatible) | Anexos, comprovantes, mídia | Disco + Network |
| Nginx/Caddy | Reverse proxy + SSL | CPU leve, Network |
| Redis (opcional) | Cache de sessões e rate limiting | RAM |

---

## 2. SISTEMA OPERACIONAL

### Recomendação Principal
| Item | Especificação |
|------|--------------|
| **SO** | **Ubuntu Server 22.04 LTS** (ou 24.04 LTS) |
| **Arquitetura** | x86_64 (amd64) |
| **Kernel mínimo** | 5.15+ (suporte a cgroups v2, io_uring) |
| **Alternativas** | Debian 12 Bookworm, Rocky Linux 9, Amazon Linux 2023 |

### Justificativa
- Ubuntu LTS tem suporte de segurança por **10 anos** (com ESM)
- Compatibilidade nativa com Docker Engine e containerd
- Maior base de pacotes e documentação para stack Supabase
- Suporte nativo a **IPv6 dual-stack**

### Requisitos do SO
- Docker Engine 24.0+ com Docker Compose v2
- Systemd para gerenciamento de serviços
- UFW ou nftables para firewall
- Fail2ban para proteção contra brute force
- Unattended-upgrades habilitado para patches de segurança

---

## 3. PROCESSADOR (CPU)

### Cenário: 50 Licenças Simultâneas

| Perfil | Especificação | Uso |
|--------|--------------|-----|
| **Mínimo** | 4 vCPUs / 4 cores físicos | Operação básica com contenção |
| **Recomendado** | **8 vCPUs / 8 cores físicos** | Operação confortável |
| **Ideal (escalável)** | 16 vCPUs / 16 cores físicos | Margem para picos e crescimento |

### Modelos Recomendados

| Tipo | Processador | Cores/Threads | Clock Base | TDP |
|------|------------|---------------|------------|-----|
| **Servidor Físico** | Intel Xeon E-2388G | 8C/16T | 3.2 GHz (5.1 turbo) | 95W |
| **Servidor Físico** | AMD EPYC 4344P | 8C/16T | 3.8 GHz (5.0 turbo) | 65W |
| **Alternativa budget** | Intel Xeon E-2336 | 6C/12T | 2.9 GHz (4.8 turbo) | 65W |
| **VPS/Cloud** | Equivalente a 8 vCPUs dedicados | — | 2.5 GHz+ | — |

### Distribuição de CPU por Serviço
```
PostgreSQL:        3-4 cores (40-50%)
PostgREST + Auth:  1-2 cores (15-20%)
Edge Functions:    1-2 cores (15-20%)
Realtime:          1 core    (10%)
Nginx + Redis:     0.5 core  (5%)
SO + overhead:     0.5 core  (5%)
```

### Instruções de Benchmark
- **Tipo de workload:** Mixed (OLTP + API serving)
- **Instruction set necessário:** SSE4.2, AVX2 (para PostgreSQL SIMD)
- **Virtualização:** VT-x/AMD-V (se rodar containers/VMs)

---

## 4. MEMÓRIA RAM

### Dimensionamento

| Perfil | RAM Total | Justificativa |
|--------|-----------|--------------|
| **Mínimo** | 16 GB DDR4 ECC | Operação limitada, possível swap |
| **Recomendado** | **32 GB DDR4/DDR5 ECC** | Operação confortável para 50 licenças |
| **Ideal** | 64 GB DDR5 ECC | Margem ampla + cache agressivo |

### Distribuição de Memória por Serviço

| Serviço | RAM Alocada (32 GB total) | Configuração |
|---------|---------------------------|-------------|
| PostgreSQL | **12-16 GB** | `shared_buffers=8GB`, `effective_cache_size=12GB`, `work_mem=64MB` |
| PostgREST | 1-2 GB | Pool de conexões |
| GoTrue (Auth) | 512 MB - 1 GB | Cache de JWT |
| Edge Functions (Deno) | 2-4 GB | Isolate pool para 50 tenants |
| Realtime (Elixir/BEAM) | 1-2 GB | WebSocket connections pool |
| Redis | 512 MB - 1 GB | Cache de sessões |
| Nginx | 256-512 MB | Buffers de proxy |
| Sistema Operacional | 2-3 GB | Kernel + filesystem cache |

### Especificações Técnicas
| Parâmetro | Recomendação |
|-----------|-------------|
| **Tipo** | DDR4 ECC UDIMM ou DDR5 ECC |
| **Velocidade mínima** | DDR4-3200 / DDR5-4800 |
| **Canais** | Dual-channel (mínimo) |
| **Slots ocupados** | 2x 16 GB (para 32 GB total) |
| **Expansão** | Mínimo 4 slots DIMM para upgrade futuro |
| **ECC** | **Obrigatório** para dados financeiros e transacionais |

### Swap
```
Swap configurado: 8-16 GB (em SSD)
Swappiness: vm.swappiness=10 (priorizar RAM)
```

---

## 5. ARMAZENAMENTO (DISCO)

### Configuração Recomendada

| Disco | Tipo | Capacidade | Função |
|-------|------|-----------|--------|
| **Disco 1 (SO + Apps)** | NVMe SSD PCIe 4.0 | **500 GB** | Sistema operacional, Docker, containers |
| **Disco 2 (Banco de Dados)** | NVMe SSD PCIe 4.0 | **500 GB - 1 TB** | PostgreSQL data + WAL |
| **Disco 3 (Storage/Backup)** | SATA SSD ou HDD Enterprise | **2 TB** | Anexos, mídia, backups locais |

### Especificações Técnicas dos Discos

| Parâmetro | Disco 1 (SO) | Disco 2 (DB) | Disco 3 (Storage) |
|-----------|-------------|-------------|-------------------|
| **Interface** | NVMe PCIe 4.0 x4 | NVMe PCIe 4.0 x4 | SATA III / NVMe |
| **Leitura sequencial** | 3.500+ MB/s | **7.000+ MB/s** | 500+ MB/s |
| **Escrita sequencial** | 3.000+ MB/s | **5.000+ MB/s** | 400+ MB/s |
| **IOPS aleatórios (4K)** | 500K+ | **1M+** | 50K+ |
| **Endurance (TBW)** | 300 TBW | **600+ TBW** | 300 TBW |
| **DRAM Cache** | Sim | **Obrigatório** | Desejável |
| **Modelos sugeridos** | Samsung 980 Pro 500GB | Samsung PM9A3 960GB (Enterprise) | Samsung 870 EVO 2TB |

### RAID (Opcional mas Recomendado)
| Configuração | Discos | Benefício |
|-------------|--------|-----------|
| RAID 1 (espelhamento) | 2x NVMe para DB | Redundância de dados |
| ZFS Mirror | 2x SSD para DB | Checksums + snapshots |

### Estimativa de Uso de Disco (50 Licenças / 12 meses)

| Componente | Tamanho Estimado |
|-----------|-----------------|
| PostgreSQL (dados) | 5-15 GB |
| PostgreSQL (WAL/logs) | 10-20 GB |
| Índices do banco | 3-8 GB |
| Storage (anexos/mídia) | 20-50 GB |
| Docker images | 10-15 GB |
| Logs da aplicação | 5-10 GB |
| Backups locais (7 dias) | 30-60 GB |
| **Total estimado** | **~83-178 GB** |

### Configurações do Filesystem
```
# Filesystem recomendado: ext4 ou XFS para DB
# Opções de montagem para partição do PostgreSQL:
/dev/nvme1n1p1  /var/lib/postgresql  xfs  noatime,nodiratime,discard  0  2

# I/O Scheduler para NVMe:
echo "none" > /sys/block/nvme0n1/queue/scheduler
```

---

## 6. REDE / NETWORK

### Especificação da Interface de Rede

| Parâmetro | Especificação |
|-----------|--------------|
| **Interface principal** | **1 Gbps** (mínimo) / **2.5 Gbps** (recomendado) |
| **Interface secundária** | 1 Gbps (redundância / management) |
| **Tipo de NIC** | Intel I350 (1G) ou Intel X710 (10G) |
| **Portas** | Mínimo 2x RJ45 + 1x IPMI/iLO/iDRAC |
| **Suporte** | VLAN tagging (802.1Q), Bonding (802.3ad) |

### Largura de Banda Necessária

| Tipo de Tráfego | Estimativa/mês | Pico (Mbps) |
|----------------|----------------|-------------|
| API REST (CRUD) | 20-40 GB | 50-100 |
| WebSocket (Realtime) | 5-15 GB | 20-50 |
| Webhooks (Asaas + UAZAPI) | 2-5 GB | 10-30 |
| WhatsApp Media (via UAZAPI) | 10-30 GB | 50-100 |
| Scraping (Firecrawl/Apify) | 5-10 GB | 20-50 |
| Backups offsite | 10-20 GB | 100+ (janela noturna) |
| **Total estimado** | **52-120 GB/mês** | **Pico: ~300 Mbps** |

### Requisitos de Banda
| Perfil | Banda contratada | Justificativa |
|--------|-----------------|--------------|
| **Mínimo** | 100 Mbps simétrico | Operação básica |
| **Recomendado** | **300 Mbps simétrico** | Confortável com picos |
| **Ideal** | 1 Gbps simétrico | Margem para crescimento |

### IPv6 — Configuração Obrigatória

| Item | Configuração |
|------|-------------|
| **Stack** | **Dual-stack IPv4 + IPv6** |
| **Bloco IPv6** | Mínimo /64 (recomendado /56 para sub-redes) |
| **IPv4** | 1 IP fixo público (mínimo) |
| **IPv6** | Bloco fixo roteado |
| **DNS** | Registros A (IPv4) + AAAA (IPv6) |
| **Firewall** | Regras duplicadas para IPv4 e IPv6 |
| **Reverse DNS** | Configurado para ambos (importante para e-mail) |

### Configuração de Rede no Servidor
```bash
# /etc/netplan/01-netcfg.yaml (Ubuntu)
network:
  version: 2
  ethernets:
    eno1:
      addresses:
        - 203.0.113.10/24          # IPv4 público
        - "2001:db8:1::10/64"      # IPv6 público
      routes:
        - to: default
          via: 203.0.113.1
        - to: "::/0"
          via: "2001:db8:1::1"
      nameservers:
        addresses:
          - 1.1.1.1
          - "2606:4700:4700::1111"  # Cloudflare IPv6
```

### Portas Necessárias (Firewall)

| Porta | Protocolo | Serviço | Acesso |
|-------|-----------|---------|--------|
| 443 | TCP | HTTPS (API + Frontend) | Público (IPv4 + IPv6) |
| 80 | TCP | HTTP (redirect → HTTPS) | Público (IPv4 + IPv6) |
| 22 | TCP | SSH | Restrito (IP whitelist) |
| 5432 | TCP | PostgreSQL | Interno apenas |
| 6379 | TCP | Redis | Interno apenas |
| 8000 | TCP | PostgREST | Interno (via Nginx) |
| 8443 | TCP | GoTrue (Auth) | Interno (via Nginx) |
| 4000 | TCP | Realtime | Interno (via Nginx) |
| 9100 | TCP | Node Exporter (monitoring) | Interno |

### DNS e CDN
| Item | Recomendação |
|------|-------------|
| **DNS Provider** | Cloudflare (gratuito, com proxy) |
| **CDN** | Cloudflare CDN para assets estáticos |
| **SSL** | Let's Encrypt via Certbot (auto-renewal) |
| **WAF** | Cloudflare WAF (regras básicas gratuitas) |
| **DDoS** | Cloudflare DDoS protection (incluído) |

---

## 7. FONTE DE ALIMENTAÇÃO E ENERGIA

| Item | Especificação |
|------|--------------|
| **Consumo estimado** | 200-350W (carga típica) |
| **Fonte** | 500W+ 80 Plus Gold (redundante se possível) |
| **UPS/Nobreak** | 1500 VA mínimo (autonomia de 15-30 min) |
| **Voltagem** | Bivolt automático (110/220V) |

---

## 8. REFRIGERAÇÃO E AMBIENTE

| Item | Especificação |
|------|--------------|
| **Temperatura** | 18-27°C (ideal: 20-24°C) |
| **Umidade** | 40-60% relativa |
| **Formato** | Rack 1U-2U ou Tower (se escritório) |
| **BTU necessários** | ~1.200-2.000 BTU/h |

---

## 9. RESUMO CONSOLIDADO — CONFIGURAÇÃO RECOMENDADA

### Servidor Principal (50 Licenças)

| Componente | Especificação | Estimativa de custo |
|-----------|--------------|---------------------|
| **CPU** | Intel Xeon E-2388G (8C/16T) ou AMD EPYC 4344P | $400-600 |
| **RAM** | 32 GB DDR4 ECC (2x 16 GB) | $150-250 |
| **Disco 1 (SO)** | NVMe SSD 500 GB PCIe 4.0 | $60-100 |
| **Disco 2 (DB)** | NVMe SSD 1 TB PCIe 4.0 Enterprise | $150-300 |
| **Disco 3 (Storage)** | SATA SSD 2 TB | $120-180 |
| **NIC** | Dual-port 1 Gbps Intel I350 | Incluso na placa-mãe |
| **Fonte** | 500W 80+ Gold redundante | $80-150 |
| **UPS** | 1500 VA | $200-400 |
| **SO** | Ubuntu Server 22.04 LTS | Gratuito |
| **TOTAL Hardware** | | **$1.160 - $1.980** |

### Custo Mensal de Hosting (se VPS/Cloud)

| Provider | Config equivalente | Custo/mês |
|----------|-------------------|-----------|
| Hetzner AX41 (dedicado) | 8 cores, 64 GB, 2x NVMe | €44-66 |
| OVH Rise-1 (dedicado) | 8 cores, 32 GB, 2x SSD | €60-90 |
| DigitalOcean (VPS) | 8 vCPU, 32 GB, 640 GB SSD | $168 |
| AWS EC2 (m6i.2xlarge) | 8 vCPU, 32 GB | ~$280 |
| Locaweb/Hostgator BR | Dedicado 8 cores | R$ 600-1.200 |

---

## 10. ESCALABILIDADE — ROADMAP DE CRESCIMENTO

| Licenças | CPU | RAM | Disco DB | Banda | Estimativa |
|----------|-----|-----|----------|-------|-----------|
| **50** | 8 cores | 32 GB | 1 TB NVMe | 300 Mbps | Config atual |
| **200** | 16 cores | 64 GB | 2 TB NVMe | 1 Gbps | Upgrade de RAM + CPU |
| **500** | 32 cores | 128 GB | 4 TB NVMe RAID | 1 Gbps | Separar DB em servidor dedicado |
| **1.000+** | Cluster | 256 GB+ | Distributed storage | 10 Gbps | Arquitetura multi-servidor |

---

## 11. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Provisionar servidor com Ubuntu 22.04 LTS
- [ ] Configurar dual-stack IPv4 + IPv6
- [ ] Instalar Docker Engine + Docker Compose
- [ ] Configurar firewall (UFW/nftables) com regras IPv4/IPv6
- [ ] Configurar discos separados (SO / DB / Storage)
- [ ] Deploy do Supabase self-hosted via Docker Compose
- [ ] Configurar Nginx como reverse proxy com SSL (Let's Encrypt)
- [ ] Configurar Cloudflare DNS + CDN + WAF
- [ ] Configurar backup automático (pg_dump + rsync offsite)
- [ ] Configurar monitoramento (Prometheus + Grafana ou Netdata)
- [ ] Testar failover e recovery
- [ ] Documentar runbook operacional

---

*Documento gerado automaticamente pelo sistema Whatsflow em 11/03/2026.*
