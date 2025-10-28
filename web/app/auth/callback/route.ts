import { createClient } from "@/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Session exchange error:", error);
      return NextResponse.redirect(`${origin}/login?error=session_exchange`);
    }

    // if (data?.session && data.session.provider_token) {
    //   await supabase.from("tokens").upsert(
    //     {
    //       provider_token: data.session.provider_token,
    //       user_id: data.user.id,
    //     },
    //     {
    //       onConflict: "user_id",
    //     },
    //   );
    // }

    return NextResponse.redirect(`${origin}/main-menu`);
  }

  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }
  return NextResponse.redirect(`${origin}/login?error=missing_params`);
}
