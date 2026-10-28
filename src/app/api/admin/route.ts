import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, failure } from "@/lib/http";
import { adminChangeSchema } from "@/features/admin/validation";
import { applyAdminChange } from "@/features/admin/service";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const admin = await requireAdmin();
    const input = adminChangeSchema.parse(await request.json());
    return NextResponse.json(await applyAdminChange(admin.id, input), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
