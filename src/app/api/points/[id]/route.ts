import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, isNonEmptyString, isFiniteNumber } from "@/lib/api-utils";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/points/:id — protegido pelo middleware (somente ADMIN).
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return jsonError("Não autorizado.", 401);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return jsonError("Corpo da requisição inválido.");

  const data: {
    name?: string;
    description?: string | null;
    lat?: number;
    lng?: number;
    categoryId?: string | null;
  } = {};

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name)) return jsonError("Campo 'name' inválido.");
    data.name = body.name.trim();
  }
  if (body.description !== undefined) {
    data.description = isNonEmptyString(body.description)
      ? body.description.trim()
      : null;
  }
  if (body.lat !== undefined) {
    if (!isFiniteNumber(body.lat) || body.lat < -90 || body.lat > 90) {
      return jsonError("Campo 'lat' inválido.");
    }
    data.lat = body.lat;
  }
  if (body.lng !== undefined) {
    if (!isFiniteNumber(body.lng) || body.lng < -180 || body.lng > 180) {
      return jsonError("Campo 'lng' inválido.");
    }
    data.lng = body.lng;
  }
  if (body.categoryId !== undefined) {
    data.categoryId = isNonEmptyString(body.categoryId) ? body.categoryId : null;
  }

  try {
    const point = await prisma.point.update({
      where: { id },
      data,
      include: { category: true, photos: true },
    });
    return NextResponse.json(point);
  } catch {
    return jsonError("Ponto não encontrado.", 404);
  }
}

// DELETE /api/points/:id — protegido pelo middleware (somente ADMIN).
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return jsonError("Não autorizado.", 401);
  }

  const { id } = await params;

  try {
    await prisma.point.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Ponto não encontrado.", 404);
  }
}
