import { PrismaClient } from "@prisma/client";

// Evita criar uma nova instância do PrismaClient a cada hot-reload em
// desenvolvimento (Next.js recarrega módulos, mas não o processo Node).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
