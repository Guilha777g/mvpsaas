# Deploy — EasyPanel

## 1. Criar PostgreSQL

1. EasyPanel → **New** → **Database** → **PostgreSQL 16**
2. Configurar:
   - Service Name: `crm-db`
   - Database: `crm_saas`
   - User: `crm`
   - Password: (gerar forte)
3. Anotar a connection string interna:
   ```
   postgresql://crm:SUA_SENHA@crm-db:5432/crm_saas
   ```

## 2. Rodar o schema SQL

Conectar no PostgreSQL e executar o init.sql para criar tabelas + trigger:

```bash
# Opção A: Via terminal do EasyPanel (acessar o container do postgres)
psql -U crm -d crm_saas < /caminho/init.sql

# Opção B: Conectando externamente (se porta 5432 exposta)
psql postgresql://crm:SENHA@IP_VPS:5432/crm_saas -f db/init.sql

# Opção C: Copiar e colar o conteúdo de db/init.sql no terminal psql
```

## 3. Criar o App

### Opção A: Via Git (recomendado)

1. Push do projeto para um repo Git (GitHub, GitLab, etc.)
2. EasyPanel → **New** → **App**
3. Source: **GitHub** → selecionar repo
4. Build: **Dockerfile** (auto-detecta o Dockerfile na raiz)

### Opção B: Via imagem Docker manual

```bash
# No seu PC, buildar e taguear:
docker build -t crm-saas .

# Taguear para seu registry (Docker Hub, GHCR, etc):
docker tag crm-saas seuuser/crm-saas:latest
docker push seuuser/crm-saas:latest

# No EasyPanel: New → App → Docker Image → seuuser/crm-saas:latest
```

## 4. Environment Variables

No app → aba **Environment**, adicionar:

```
DATABASE_URL=postgresql://crm:SUA_SENHA@crm-db:5432/crm_saas
JWT_SECRET=GERE_COM_openssl_rand_-hex_32
NEXT_PUBLIC_APP_URL=https://crm.seudominio.com
```

**IMPORTANTE:** O hostname `crm-db` é o nome do serviço PostgreSQL no EasyPanel.
O EasyPanel conecta os serviços pela rede interna automaticamente.

## 5. Domínio + SSL

1. App → aba **Domains**
2. Adicionar: `crm.seudominio.com`
3. Apontar DNS (A record) do domínio para o IP da VPS
4. SSL é automático via Let's Encrypt (Traefik)

## 6. Testar

1. Acessar `https://crm.seudominio.com`
2. Registrar primeira conta (cria tenant + pipeline SPIN automaticamente)
3. Ir em **Configurações → Agente IA** para pegar o `tenant_id`
4. Configurar no n8n o `tenant_id` no INSERT da `agent_leads`

## Troubleshooting

### App não conecta no banco
- Verificar se o nome do serviço PostgreSQL bate com o hostname na DATABASE_URL
- No EasyPanel, ambos os serviços devem estar no mesmo projeto

### Tabelas não existem
- O init.sql precisa ser executado manualmente (passo 2)
- O EasyPanel não roda init.sql automaticamente como docker-compose

### Build falha
- Verificar se o Dockerfile está na raiz do repo
- Logs do build ficam na aba "Deployments" do app

## Requisitos da VPS

| Recurso | Mínimo |
|---------|--------|
| RAM | 2 GB |
| CPU | 2 vCPU |
| Disco | 20 GB SSD |
| OS | Ubuntu 22+ (com EasyPanel instalado) |
