import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const accounts = await sql<{ username: string; display_name: string }[]>`
    select username, display_name from accounts order by display_name
  `;

  return NextResponse.json({
    me: session,
    accounts: accounts.map((a) => ({ username: a.username, displayName: a.display_name })),
  });
}
