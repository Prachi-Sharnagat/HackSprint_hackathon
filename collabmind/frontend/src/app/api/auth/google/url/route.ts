import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const roomId = searchParams.get("roomId") || "general";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google";

  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  // Scopes required for generating Google Meet via Calendar API
  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ].join(" ");

  const state = JSON.stringify({ roomId });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent",
      state: state,
    }).toString();

  return NextResponse.json({ url: authUrl });
}
