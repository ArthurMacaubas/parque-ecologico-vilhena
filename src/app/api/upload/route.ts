import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, isNonEmptyString } from "@/lib/api-utils";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Pasta fixa e estática (dentro de "public") para o Turbopack conseguir
// rastrear as dependências do build corretamente, sem varrer o projeto
// inteiro por causa de um caminho dinâmico. Para mudar o destino, edite a
// constante abaixo diretamente.
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// POST /api/upload — protegido pelo middleware (somente ADMIN autenticado).
// Espera multipart/form-data com os campos "file" e "pointId".
export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return jsonError("Não autorizado.", 401);
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError("Corpo multipart/form-data esperado.");

  const file = formData.get("file");
  const pointId = formData.get("pointId");

  if (!(file instanceof File)) {
    return jsonError("Campo 'file' é obrigatório.");
  }
  if (!isNonEmptyString(pointId)) {
    return jsonError("Campo 'pointId' é obrigatório.");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError("Tipo de arquivo não suportado. Use JPEG, PNG ou WebP.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    return jsonError("Arquivo maior que 5MB.");
  }

  const point = await prisma.point.findUnique({ where: { id: pointId } });
  if (!point) {
    return jsonError("Ponto não encontrado.", 404);
  }

  const pointDir = path.join(UPLOAD_ROOT, "points", pointId);
  await mkdir(pointDir, { recursive: true });

  const filename = `${randomUUID()}${EXTENSION_BY_TYPE[file.type]}`;
  const filePath = path.join(pointDir, filename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, bytes);

  const url = `/uploads/points/${pointId}/${filename}`;

  const photo = await prisma.photo.create({
    data: { url, filename, pointId },
  });

  return NextResponse.json(photo, { status: 201 });
}
