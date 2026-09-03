# Deploy no Coolify (4.0 beta.463+)

Este guia assume que você já tem o Coolify rodando no servidor da escola e
acesso admin a ele.

## 1. Suba o código para o GitHub

Veja as instruções que te passei separadamente para criar o repositório.
Depois de criado e com o código enviado (`git push`), volte aqui.

## 2. Crie o recurso no Coolify

1. No painel do Coolify, abra o **Project** onde esse app deve ficar (ou
   crie um novo).
2. **+ New Resource** → **Docker Compose** (não "Application" — esse
   projeto sobe dois serviços juntos: app + banco).
3. Escolha a fonte: **GitHub** (conecte sua conta/instale o GitHub App do
   Coolify se ainda não tiver feito, ou use "Public Repository" se o repo
   for público).
4. Selecione o repositório e a branch (`main`).
5. Em **Base Directory**, deixe `/`.
6. Em **Docker Compose Location**, aponte para `docker-compose.coolify.yml`
   (não o `docker-compose.yml` padrão — esse é só para desenvolvimento
   local e sobe apenas o banco).

## 3. Configure as variáveis de ambiente

Na aba **Environment Variables** do recurso, o Coolify vai detectar
automaticamente as variáveis usadas no compose (as marcadas com `:?` no
arquivo aparecem com borda vermelha até serem preenchidas). Preencha:

| Variável | Valor |
|---|---|
| `DB_PASSWORD` | uma senha forte para o Postgres (ex.: gere com `openssl rand -base64 24`) |
| `AUTH_SECRET` | gere com `openssl rand -base64 32` |
| `NEXTAUTH_URL` | a URL pública final, ex. `https://parque.SEU-DOMINIO.ifro.edu.br` (sem porta) |
| `SUAP_CLIENT_ID` | do cadastro OAuth2 no SUAP (passo 5) |
| `SUAP_CLIENT_SECRET` | idem |
| `SUAP_ADMIN_MATRICULAS` | sua matrícula (e de quem mais for admin), separadas por vírgula |
| `SUAP_BASE_URL` | opcional, padrão já é `https://suap.ifro.edu.br` |

## 4. Configure o domínio

1. Vá na aba do serviço **app** dentro do recurso (não o `db`) →
   **Domains**.
2. Digite `http://parque.SEU-DOMINIO.ifro.edu.br:3000` — a porta `:3000`
   é o que diz ao Coolify para onde mandar o tráfego *dentro* do
   container (o app escuta na 3000). Publicamente ele continua saindo em
   443/80 normalmente.
3. Se o servidor tiver um domínio configurado, o Coolify emite certificado
   HTTPS automaticamente (Let's Encrypt) depois do primeiro deploy — pode
   levar alguns minutos.
4. **Importante**: garanta que `NEXTAUTH_URL` (passo 3) seja exatamente
   esse domínio, com `https://` e **sem** a porta `:3000`.
5. O serviço **db** não recebe domínio nem porta pública — fica só na rede
   interna do Coolify, acessível pelo `app` como host `db`. Não mexa nisso.

## 5. Cadastre a aplicação OAuth2 no SUAP (produção)

No SUAP: **Tecnologia da Informação > API (OAuth2) > Minhas Aplicações**,
crie uma aplicação nova (ou edite a de desenvolvimento) com:

- **Redirect URI**: `https://parque.SEU-DOMINIO.ifro.edu.br/api/auth/callback/suap`
- Copie o `Client ID` e `Client Secret` para as variáveis do passo 3.

Se você já tinha uma aplicação OAuth2 cadastrada para desenvolvimento
(`http://localhost:3000/...`), pode adicionar essa nova redirect URI à
mesma aplicação em vez de criar outra — o SUAP aceita múltiplos redirect
URIs por aplicação.

## 6. Deploy

Clique em **Deploy**. O Coolify vai:

1. Clonar o repositório
2. Buildar a imagem pelo `Dockerfile` (inclui `npm run build` e o
   `prisma generate` do `postinstall`)
3. Subir o `db` (Postgres+PostGIS) e esperar o healthcheck
4. Subir o `app` — o `docker-entrypoint.sh` roda
   `prisma migrate deploy` automaticamente antes de iniciar o servidor,
   então as tabelas são criadas/atualizadas sozinhas a cada deploy

Acompanhe os logs na própria tela de deploy. Se o `prisma migrate deploy`
falhar, o container não sobe — os logs vão indicar exatamente qual
migration falhou.

## 7. Verificação pós-deploy

- `https://parque.SEU-DOMINIO.ifro.edu.br` → mapa público deve carregar
- `/login` → botão "Entrar com SUAP" deve redirecionar pro SUAP e voltar
  autenticado
- Depois de logar com uma matrícula listada em `SUAP_ADMIN_MATRICULAS`,
  `/admin` deve abrir o painel

## Persistência entre deploys

- **Banco de dados**: volume `pgdata`, definido no compose — sobrevive a
  redeploys.
- **Fotos enviadas**: volume `uploads` montado em `/app/public/uploads` —
  também sobrevive a redeploys. Sem isso, cada novo build apagaria as
  fotos (o Dockerfile recria a pasta vazia a cada build).

## Backups

Configure backup automático do volume `pgdata` pelo próprio Coolify
(**Storages** → volume → **Backup**), ou do banco via o recurso de
"Scheduled Backups" do Coolify se você registrar o Postgres como um
recurso de banco de dados nativo em vez de dentro do compose — como está
hoje (banco dentro do compose), o backup mais simples é do volume mesmo.
EOF
