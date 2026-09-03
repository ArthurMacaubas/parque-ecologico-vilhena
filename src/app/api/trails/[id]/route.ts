import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, isNonEmptyString, isValidTrailGeoJSON } from "@/lib/api-utils";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/trails/:id — protegido pelo middleware (somente ADMIN).
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
    geojson?: object;
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
  if (body.geojson !== undefined) {
    if (!isValidTrailGeoJSON(body.geojson)) {
      return jsonError("Campo 'geojson' inválido.");
    }
    data.geojson = body.geojson;
  }
  if (body.categoryId !== undefined) {
    data.categoryId = isNonEmptyString(body.categoryId) ? body.categoryId : null;
  }

  try {
    const trail = await prisma.trail.update({
      where: { id },
      data,
      include: { category: true },
    });
    return NextResponse.json(trail);
  } catch {
    return jsonError("Trilha não encontrada.", 404);
  }
}

// DELETE /api/trails/:id — protegido pelo middleware (somente ADMIN).
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return jsonError("Não autorizado.", 401);
  }

  const { id } = await params;

  try {
    await prisma.trail.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Trilha não encontrada.", 404);
  }
}
