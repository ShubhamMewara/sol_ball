import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";

export async function parseJson<T extends ZodSchema>(
  req: NextRequest,
  schema: T
): Promise<{ data: ReturnType<T["parse"]> } | { error: NextResponse }>
{
  try {
    const raw = await req.json();
    const data = schema.parse(raw) as ReturnType<T["parse"]>;
    return { data };
  } catch (e: any) {
    const msg = e?.issues ? JSON.stringify(e.issues) : String(e?.message || e);
    return { error: NextResponse.json({ error: msg }, { status: 400 }) };
  }
}
