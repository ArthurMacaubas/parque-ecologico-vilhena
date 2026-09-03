import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api-utils";

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/photos/:id — protegido manualmente (não coberto pelo
// middleware, que só cobre /api/points, /api/trails e /api/upload).
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return jsonError("Não autorizado.", 401);
  }

  const { id } = await params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return jsonError("Foto não encontrada.", 404);

  await prisma.photo.delete({ where: { id } });

  const filePath = path.join(process.cwd(), "public", photo.url);
  await unlink(filePath).catch(() => {
    // Arquivo já pode ter sido removido manualmente; não é um erro fatal.
  });

  return NextResponse.json({ ok: true });
}
