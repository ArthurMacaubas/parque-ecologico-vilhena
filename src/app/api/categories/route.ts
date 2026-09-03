import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, isNonEmptyString } from "@/lib/api-utils";

// GET /api/categories — público, usado para popular filtros e formulários.
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

// POST /api/categories — protegido por middleware (somente ADMIN autenticado).
export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return jsonError("Não autorizado.", 401);
  }

  const body = await request.json().catch(() => null);
  if (!body || !isNonEmptyString(body.name)) {
    return jsonError("Campo 'name' é obrigatório.");
  }

  const category = await prisma.category.create({
    data: {
      name: body.name.trim(),
      color: isNonEmptyString(body.color) ? body.color : undefined,
      icon: isNonEmptyString(body.icon) ? body.icon : undefined,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
