import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  await sql`
    update tasks set completed = ${!!body.completed}, updated_at = now() where id = ${id}
  `;

  return NextResponse.json({ ok: true });
}
