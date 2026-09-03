import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

const ADMIN_MATRICULAS = (process.env.SUAP_ADMIN_MATRICULAS ?? "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// Config completa, com acesso ao Prisma — usada pela rota de callback do
// NextAuth e por qualquer server component/route handler que chame auth().
// NUNCA importar este arquivo a partir de middleware.ts (roda no Edge, sem
// suporte ao Prisma); o middleware usa apenas auth.config.ts.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.id || !user.name) return false;

      const role = ADMIN_MATRICULAS.includes(user.id) ? "ADMIN" : "COLABORADOR";

      // Cria ou atualiza o usuário local a partir dos dados do SUAP.
      // Não promove ninguém de ADMIN para COLABORADOR automaticamente,
      // caso um admin tenha sido promovido manualmente no banco.
      await prisma.user.upsert({
        where: { matricula: user.id },
        create: {
          matricula: user.id,
          nome: user.name,
          email: user.email ?? undefined,
          role,
        },
        update: {
          nome: user.name,
          email: user.email ?? undefined,
        },
      });

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { matricula: user.id },
        });
        token.matricula = user.id;
        token.role = dbUser?.role ?? "COLABORADOR";
      }
      return token;
    },
  },
});
