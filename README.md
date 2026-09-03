# Parque Ecológico de Vilhena — Mapa Interativo

Sistema web para mapear o Parque Ecológico de Vilhena-RO: mapa de satélite
interativo, pontos de interesse com fotos, trilhas/áreas desenhadas, e um
painel administrativo autenticado via SUAP/IFRO.

## Stack

- Next.js (App Router) + TypeScript + React
- MapLibre GL JS (satélite: Esri World Imagery, sem API key)
- PostgreSQL + PostGIS via Prisma
- Autenticação: SUAP/IFRO (OAuth2) via NextAuth (Auth.js v5)
- Upload de fotos: disco local (`public/uploads`)
- Trilhas/áreas: `terra-draw`, persistidas como GeoJSON

## Rodando localmente

```bash
cp .env.example .env
npm install          # também roda "prisma generate" (postinstall)

# Banco de dados local (Postgres + PostGIS)
docker compose up -d
npx prisma migrate dev --name init

npm run dev
```

Abra `http://localhost:3000` (mapa público) e `http://localhost:3000/login`
(entrada da equipe via SUAP → `/admin`).

Antes do login funcionar, cadastre a aplicação OAuth2 no SUAP:
**SUAP > Tecnologia da Informação > API (OAuth2) > Minhas Aplicações**,
com redirect URI `http://localhost:3000/api/auth/callback/suap`, e preencha
`SUAP_CLIENT_ID`, `SUAP_CLIENT_SECRET` e `SUAP_ADMIN_MATRICULAS` no `.env`.

## Estrutura

```
src/
├── app/
│   ├── page.tsx              # mapa público
│   ├── login/                # login SUAP
│   ├── admin/                # painel (protegido)
│   └── api/                  # rotas REST (points, trails, categories, upload)
├── components/
│   ├── Map.tsx                # mapa público
│   └── admin/AdminMap.tsx     # mapa do painel (criar pontos/trilhas)
├── lib/                       # prisma, auth, helpers
└── proxy.ts                   # protege /admin e as APIs de escrita
prisma/schema.prisma            # modelos: User, Category, Point, Photo, Trail
docker-compose.yml               # banco local (dev)
docker-compose.coolify.yml       # stack completa para deploy (Coolify)
Dockerfile                       # imagem de produção (multi-stage, standalone)
```

## Deploy em produção

Ver [`DEPLOY.md`](./DEPLOY.md) para o passo a passo completo no Coolify.

## Fases do projeto

1. Mapa interativo básico (satélite, clique → coordenadas)
2. Banco de dados (Postgres + PostGIS via Prisma)
3. Autenticação SUAP + painel administrativo
4. Upload de fotos por ponto
5. Trilhas/áreas desenhadas como GeoJSON
