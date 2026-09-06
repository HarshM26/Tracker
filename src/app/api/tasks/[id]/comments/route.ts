import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  }

  const commentId = crypto.randomUUID();
  await sql`
    insert into comments (id, task_id, author, body)
    values (${commentId}, ${id}, ${session.displayName}, ${text})
  `;
  await sql`update tasks set updated_at = now() where id = ${id}`;

  return NextResponse.json({ id: commentId }, { status: 201 });
}
