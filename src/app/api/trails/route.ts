import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, isNonEmptyString, isValidTrailGeoJSON } from "@/lib/api-utils";

// GET /api/trails — público, retorna todas as trilhas/áreas como GeoJSON.
export async function GET() {
  const trails = await prisma.trail.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(trails);
}

// POST /api/trails — protegido pelo middleware (somente ADMIN autenticado).
export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return jsonError("Não autorizado.", 401);
  }

  const body = await request.json().catch(() => null);
  if (!body) return jsonError("Corpo da requisição inválido.");

  const { name, description, geojson, categoryId } = body;

  if (!isNonEmptyString(name)) return jsonError("Campo 'name' é obrigatório.");
  if (!isValidTrailGeoJSON(geojson)) {
    return jsonError(
      "Campo 'geojson' inválido: esperado uma Feature GeoJSON do tipo LineString ou Polygon.",
    );
  }

  const trail = await prisma.trail.create({
    data: {
      name: name.trim(),
      description: isNonEmptyString(description) ? description.trim() : null,
      geojson,
      categoryId: isNonEmptyString(categoryId) ? categoryId : null,
      createdById: session.user.id,
    },
    include: { category: true },
  });

  return NextResponse.json(trail, { status: 201 });
}
