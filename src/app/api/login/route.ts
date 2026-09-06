import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import sql from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !password) {
    return NextResponse.json({ error: "Enter a name and password." }, { status: 400 });
  }

  const username = name.toLowerCase();
  const [account] = await sql<
    { username: string; display_name: string; password_hash: string }[]
  >`select username, display_name, password_hash from accounts where username = ${username}`;

  if (!account) {
    return NextResponse.json({ error: "No account with that name." }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, account.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  await createSession({ username: account.username, displayName: account.display_name });
  return NextResponse.json({ ok: true });
}
