# DisparadorWP

Painel multi-workspace para cadastro de contatos, segmentação, criação de templates Meta e
disparo/agendamento de campanhas de WhatsApp. Construído para rodar 100% na Vercel com banco
Neon Postgres e autenticação Neon Auth.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Neon Postgres** via `@neondatabase/serverless` + **Drizzle ORM**
- **Neon Auth** (Managed Better Auth) — login/cadastro e **organizations como workspaces**
  multi-tenant (convites, papéis owner/admin/member)
- **Tailwind CSS v4** com um kit de UI próprio (sem dependências externas de componentes)
- **Vercel Cron** para o worker de disparo de campanhas (`vercel.json`)
- Integração com WhatsApp via **arquitetura de plugins** (`lib/whatsapp`) — o primeiro provider é
  o **NotificaMe Hub**

## Setup

### 1. Banco de dados e autenticação (Neon)

1. Crie um projeto no [Neon](https://neon.tech).
2. No painel do projeto, vá em **Auth** e habilite o **Neon Auth (Managed Better Auth)**. Nesta
   tela, confirme que o recurso de **Organizations** está habilitado — é ele quem implementa os
   workspaces deste app (convites, papéis, etc.). Se a opção não estiver visível por padrão,
   procure por "Organizations"/"Multi-tenant" nas configurações do Auth.
3. Copie as variáveis mostradas na aba **Configuration > Next.js**: `DATABASE_URL`,
   `NEON_AUTH_BASE_URL`. Gere `NEON_AUTH_COOKIE_SECRET` com `openssl rand -base64 32`.

### 2. Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do Neon |
| `NEON_AUTH_BASE_URL` | Base URL do Neon Auth (aba Configuration) |
| `NEON_AUTH_COOKIE_SECRET` | `openssl rand -base64 32` |
| `CONNECTION_SECRET_KEY` | `openssl rand -base64 32` — criptografa as credenciais dos plugins de WhatsApp em repouso |
| `CRON_SECRET` | Qualquer string secreta — protege `/api/cron/dispatch-campaigns`. Configure a **mesma** variável no projeto na Vercel: ela envia esse valor automaticamente no header `Authorization` das chamadas de cron |
| `APP_BASE_URL` | URL pública do app (usada para montar a URL do webhook mostrada em Configurações > Conexão WhatsApp) |

### 3. Instalar e migrar

```bash
npm install
npm run db:push   # aplica o schema direto (dev) — ou npm run db:generate + aplique a migration em drizzle/
```

### 4. Rodar localmente

```bash
npm run dev
```

Acesse `http://localhost:3000`, crie sua conta e, no primeiro acesso, crie seu primeiro
workspace.

### 5. Deploy (Vercel)

O projeto já está criado e linkado ao repositório na Vercel (`disparadorwp`, deploy automático a
cada push na branch padrão). Falta apenas:

1. Na aba **Storage** do projeto, conecte a integração nativa **Neon** (ela pode preencher
   `DATABASE_URL` automaticamente) — ou aponte para o mesmo projeto Neon do item 1.
2. Configure as demais variáveis de ambiente do item 2 em **Settings > Environment Variables**.
3. Faça um novo deploy (ou um push vazio) depois de configurar as variáveis, já que o primeiro
   deploy só tem o build passando de verdade quando `DATABASE_URL`, `NEON_AUTH_*` e
   `CONNECTION_SECRET_KEY` existem no ambiente da Vercel.

**Sobre o cron de disparo — importante no plano Hobby**: a conta da Vercel usada está no plano
**Hobby**, que permite no máximo **1 execução de cron por dia** (o disparo em `*/5 * * * *` foi
rejeitado no deploy com `cron_jobs_limits_reached`). O `vercel.json` está com `"0 12 * * *"`
(uma vez por dia, 12h UTC) só para o deploy funcionar — isso não é suficiente para agendar
campanhas em horário específico. Para ter precisão de minutos sem pagar Pro, chame
`/api/cron/dispatch-campaigns` a partir de um agendador externo (GitHub Actions com `schedule`,
cron-job.org, Upstash QStash, etc.) a cada poucos minutos, enviando o header
`Authorization: Bearer <CRON_SECRET>` — a rota não depende do Vercel Cron especificamente, só
precisa ser chamada por HTTPS com esse header. A alternativa mais simples é fazer upgrade do
time para o plano **Pro**, que libera cron por minuto nativamente.

### 6. Conectar o WhatsApp (plugin NotificaMe)

Em **Configurações > Conexão WhatsApp**, adicione uma conexão informando o **token da conta** e
o **token do canal** (obtidos no painel da NotificaMe Hub, depois de cadastrar seu número de
WhatsApp Business lá). O app testa a conexão automaticamente (endpoint de saúde do canal) e
permite registrar o webhook de eventos com um clique.

## Arquitetura de plugins de WhatsApp

Cada provedor de WhatsApp é isolado em `lib/whatsapp/providers/<chave>/`, implementando a
interface `WhatsAppProvider` (`lib/whatsapp/types.ts`): testar conexão, enviar texto/template,
listar/criar/excluir templates, registrar webhook e interpretar eventos recebidos. O registro
fica centralizado em `lib/whatsapp/registry.ts` — nenhum outro ponto do app importa um provider
diretamente.

Para adicionar um novo provedor no futuro:

1. Crie `lib/whatsapp/providers/<chave>/provider.ts` implementando `WhatsAppProvider`.
2. Registre a instância em `lib/whatsapp/registry.ts`.
3. Ele aparece automaticamente na tela de Configurações > Conexão WhatsApp.

### NotificaMe — o que foi validado contra a API real

A implementação (`lib/whatsapp/providers/notificame`) segue literalmente os endpoints e payloads
documentados em `https://app.notificame.com.br/docs/api.md`: autenticação via header
`X-Api-Token`, criação/listagem/exclusão de templates (`/v1/templates/...`,
`/v2/channels/whatsapp/templates/...`), envio de mensagens e templates
(`/v2/channels/whatsapp/messages`, `/v2/channels/whatsapp/message_templates` — este último, a
API "Marketing Messages Lite", é o usado no disparo de campanhas), saúde do canal
(`/v2/meta/health_status`) e assinatura de webhook (`/v1/subscriptions/`).

**Não documentado publicamente** e por isso não garantido nesta implementação:

- Endpoint para listar canais/obter o `channelToken` programaticamente — por isso ele é colado
  manualmente na tela de conexão (padrão comum nesse tipo de integração).
- O payload exato dos eventos recebidos no webhook (status de entrega/leitura, mensagens
  recebidas). O handler (`app/api/webhooks/[provider]/[connectionId]/route.ts`) sempre grava o
  payload bruto em `webhook_events` e tenta interpretá-lo de forma best-effort
  (`provider.parseWebhookEvent`). Assim que a conexão real estiver registrada, vale conferir a
  tabela `webhook_events` para ajustar o parser aos payloads reais.

## Modelo de dados

- Workspaces = **organizations** do Neon Auth/Better Auth (tabelas gerenciadas por ele, fora
  destas migrations). Papéis: `owner`, `admin`, `member`.
- `lib/db/schema.ts` define as tabelas de negócio (`contacts`, `tags`, `segments`, `campaigns`,
  `campaign_recipients`, `whatsapp_connections`, `whatsapp_templates`, `webhook_events`), todas
  isoladas por `organization_id`.
- Toda página/action passa por `requireWorkspaceMember()` (`lib/workspace/auth.ts`), que resolve
  a organização pelo slug da URL e confirma que o usuário logado é membro — nenhuma tabela de
  negócio é acessada sem essa checagem.

## Scripts

```bash
npm run dev         # ambiente de desenvolvimento
npm run build        # build de produção (typecheck incluso)
npm run test          # testes unitários (vitest)
npm run db:generate   # gera uma migration a partir do schema
npm run db:push        # aplica o schema direto no banco (bom para dev)
npm run db:studio       # abre o Drizzle Studio
```

## Limitações conhecidas / próximos passos

- Segmentação é manual (contato é atribuído a um segmento explicitamente); segmentos dinâmicos
  por regra de tag ficam como evolução futura.
- O agendamento de campanhas depende do Vercel Cron (granularidade de minutos, não de segundo).
- A tradução das telas prontas de autenticação (`@neondatabase/auth-ui`) cobre os fluxos
  principais (login, cadastro, gestão de organização/membros) em `lib/auth/localization.ts`;
  telas menos comuns podem aparecer em inglês.
