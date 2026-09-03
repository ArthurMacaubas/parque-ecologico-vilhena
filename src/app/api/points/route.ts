import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, isNonEmptyString, isFiniteNumber } from "@/lib/api-utils";

// GET /api/points — público, retorna todos os pontos com categoria e fotos.
export async function GET() {
  const points = await prisma.point.findMany({
    include: { category: true, photos: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(points);
}

// POST /api/points — protegido pelo middleware (somente ADMIN autenticado).
export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return jsonError("Não autorizado.", 401);
  }

  const body = await request.json().catch(() => null);
  if (!body) return jsonError("Corpo da requisição inválido.");

  const { name, description, lat, lng, categoryId } = body;

  if (!isNonEmptyString(name)) return jsonError("Campo 'name' é obrigatório.");
  if (!isFiniteNumber(lat) || lat < -90 || lat > 90) {
    return jsonError("Campo 'lat' inválido.");
  }
  if (!isFiniteNumber(lng) || lng < -180 || lng > 180) {
    return jsonError("Campo 'lng' inválido.");
  }

  const point = await prisma.point.create({
    data: {
      name: name.trim(),
      description: isNonEmptyString(description) ? description.trim() : null,
      lat,
      lng,
      categoryId: isNonEmptyString(categoryId) ? categoryId : null,
      createdById: session.user.id,
    },
    include: { category: true, photos: true },
  });

  return NextResponse.json(point, { status: 201 });
}
