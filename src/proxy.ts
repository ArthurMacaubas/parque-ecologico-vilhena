import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Usa a config "leve" (sem Prisma): o Prisma só é acessado nos callbacks de
// login (auth.ts), não a cada request. Runtime Node.js (padrão do proxy.ts
// no Next.js 16), então tocar no Prisma aqui até seria possível — mas
// mantemos a separação por clareza e para não inicializar o client sem
// necessidade nesta camada de interceptação de requests.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === "ADMIN";
  const { pathname } = req.nextUrl;

  const isProtectedPage = pathname.startsWith("/admin");
  const isProtectedPointsApi =
    pathname.startsWith("/api/points") && req.method !== "GET";
  const isProtectedTrailsApi =
    pathname.startsWith("/api/trails") && req.method !== "GET";
  const isUploadApi = pathname.startsWith("/api/upload");

  const needsAuth =
    isProtectedPage || isProtectedPointsApi || isProtectedTrailsApi || isUploadApi;

  if (!needsAuth) {
    return NextResponse.next();
  }

  if (!isLoggedIn || !isAdmin) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Não autorizado. Faça login com sua conta SUAP." },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/points/:path*", "/api/trails/:path*", "/api/upload/:path*"],
};
