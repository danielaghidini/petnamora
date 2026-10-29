import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, failure } from "@/lib/http";
import { adminChangeSchema } from "@/features/admin/validation";
import { applyAdminChange } from "@/features/admin/service";
import { cleanDeletedAccountPhotos } from "@/features/admin/photo-cleanup";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const admin = await requireAdmin();
    const input = adminChangeSchema.parse(await request.json());
    const result = await applyAdminChange(admin.id, input);
    let notice: string | undefined;
    if (input.kind === "user-delete" || input.kind === "photo-cleanup") {
      try {
        const pending = await cleanDeletedAccountPhotos();
        notice = pending
          ? `${input.kind === "user-delete" ? "Conta excluída. " : ""}${pending} foto(s) com limpeza pendente. Use “Limpar fotos pendentes” para tentar novamente.`
          : input.kind === "user-delete" ? "Conta e fotos excluídas." : "Limpeza de fotos concluída.";
      } catch {
        notice = "A alteração foi salva. A limpeza de fotos ficou pendente; use “Limpar fotos pendentes” para tentar novamente.";
      }
    }
    return NextResponse.json({ ...result, notice }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
