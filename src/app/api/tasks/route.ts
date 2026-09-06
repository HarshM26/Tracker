import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Task } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const rows = await sql`
    select
      t.id, t.start_date, t.assigned_to, t.created_by, t.summary, t.completed,
      t.created_at, t.updated_at,
      coalesce(
        json_agg(
          json_build_object('id', c.id, 'author', c.author, 'body', c.body, 'createdAt', c.created_at)
          order by c.created_at
        ) filter (where c.id is not null),
        '[]'
      ) as comments
    from tasks t
    left join comments c on c.task_id = t.id
    group by t.id
    order by t.start_date desc, t.created_at desc
  `;

  const tasks: Task[] = rows.map((r) => ({
    id: r.id,
    startDate: r.start_date,
    assignedTo: r.assigned_to,
    createdBy: r.created_by,
    summary: r.summary,
    completed: r.completed,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    comments: r.comments,
  }));

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const assignedTo = typeof body.assignedTo === "string" ? body.assignedTo : "";
  const startDate =
    typeof body.startDate === "string" && body.startDate
      ? body.startDate
      : new Date().toISOString().slice(0, 10);

  if (!summary || !assignedTo) {
    return NextResponse.json({ error: "A description and assignee are required." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await sql`
    insert into tasks (id, start_date, assigned_to, created_by, summary)
    values (${id}, ${startDate}, ${assignedTo}, ${session.username}, ${summary})
  `;

  return NextResponse.json({ id }, { status: 201 });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await sql`delete from tasks`; // comments cascade via FK
  return NextResponse.json({ ok: true });
}
