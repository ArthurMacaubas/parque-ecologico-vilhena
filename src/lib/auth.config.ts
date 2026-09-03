import type { NextAuthConfig } from "next-auth";
import type { OAuthConfig } from "next-auth/providers";

const SUAP_BASE_URL = process.env.SUAP_BASE_URL ?? "https://suap.ifro.edu.br";

/**
 * Formato de perfil retornado por `${SUAP_BASE_URL}/api/eu/` (endpoint
 * padrão "meus dados" do SUAP, usado por outras integrações OAuth2 do
 * ecossistema SUAP/IFs). Os nomes de campo seguem a API pública do SUAP.
 */
export interface SuapProfile {
  identificacao: string;
  nome_usual?: string;
  nome_completo?: string;
  email?: string;
  url_foto_75x100?: string;
  [key: string]: unknown;
}

const SuapProvider: OAuthConfig<SuapProfile> = {
  id: "suap",
  name: "SUAP",
  type: "oauth",
  authorization: {
    url: `${SUAP_BASE_URL}/o/authorize/`,
    params: { scope: "identificacao email" },
  },
  token: `${SUAP_BASE_URL}/o/token/`,
  userinfo: `${SUAP_BASE_URL}/api/eu/`,
  clientId: process.env.SUAP_CLIENT_ID,
  clientSecret: process.env.SUAP_CLIENT_SECRET,
  checks: ["state"],
  profile(profile) {
    return {
      id: profile.identificacao,
      name: profile.nome_usual ?? profile.nome_completo ?? profile.identificacao,
      email: profile.email ?? null,
      image: profile.url_foto_75x100 ?? null,
    };
  },
};

/**
 * Config "leve", sem nenhuma chamada ao Prisma — é a única parte do
 * NextAuth que pode rodar no runtime Edge (usada pelo middleware.ts para
 * proteger rotas só lendo o JWT já existente, sem tocar no banco).
 * A gravação/leitura de usuário no banco fica em auth.ts, que roda apenas
 * em rotas Node (route handlers, server components).
 */
export const authConfig = {
  providers: [SuapProvider],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.matricula as string;
        session.user.role = (token.role as "ADMIN" | "COLABORADOR") ?? "COLABORADOR";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
