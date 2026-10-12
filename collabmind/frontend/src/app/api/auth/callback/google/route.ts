import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");

  let roomId = "general";
  if (stateRaw) {
    try {
      const parsed = JSON.parse(stateRaw);
      if (parsed.roomId) roomId = parsed.roomId;
    } catch {
      roomId = stateRaw;
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error || !code) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      `${baseUrl}/chat/${roomId}?meetError=${encodeURIComponent(error || "Authorization was denied")}`
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google";

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Failed to exchange Google OAuth code:", tokenData);
      return NextResponse.redirect(
        `${baseUrl}/chat/${roomId}?meetError=${encodeURIComponent(tokenData.error_description || "Token exchange failed")}`
      );
    }

    const accessToken = tokenData.access_token;

    // 2. Create calendar event with Google Meet conferenceData
    const startTime = new Date();
    const endTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour duration
    const requestId = `collabmind-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const eventPayload = {
      summary: `CollabMind #${roomId} Meeting`,
      description: "Real-time collaborative brainstorming and AI agent session.",
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: requestId,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    };

    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      }
    );

    const eventData = await calendarResponse.json();

    // 3. Extract the Google Meet link
    let meetLink = eventData.hangoutLink;

    if (!meetLink && eventData.conferenceData?.entryPoints) {
      const videoEntry = eventData.conferenceData.entryPoints.find(
        (e: any) => e.entryPointType === "video"
      );
      if (videoEntry?.uri) {
        meetLink = videoEntry.uri;
      }
    }

    if (!meetLink) {
      // Fallback: If domain doesn't permit automated conference injection, construct a standard meeting room
      meetLink = `https://meet.google.com/new`;
    }

    // 4. Redirect user back to chat room with the generated Google Meet link
    return NextResponse.redirect(
      `${baseUrl}/chat/${roomId}?meetUrl=${encodeURIComponent(meetLink)}&meetSuccess=true`
    );
  } catch (err: any) {
    console.error("Error creating Google Meet via Calendar API:", err);
    return NextResponse.redirect(
      `${baseUrl}/chat/${roomId}?meetError=${encodeURIComponent(err.message || "Failed to create Google Meet")}`
    );
  }
}
