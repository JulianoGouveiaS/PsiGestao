import {google} from "npm:googleapis@130";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
      return new Response(
        JSON.stringify({
          error: "Google Service Account não configurada. Configure a chave GOOGLE_SERVICE_ACCOUNT_KEY.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { scheduledAt, patientName } = await req.json();
    if (!scheduledAt) {
      return new Response(
        JSON.stringify({ error: "scheduledAt é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let credentials;
    try {
      credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch {
      // Try parsing as double-encoded JSON
      try {
        credentials = JSON.parse(JSON.parse(`"${GOOGLE_SERVICE_ACCOUNT_KEY.replace(/"/g, '\\"')}"`));
      } catch {
        return new Response(
          JSON.stringify({ error: "GOOGLE_SERVICE_ACCOUNT_KEY não é um JSON válido. Cole o conteúdo completo do arquivo .json." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    const startTime = new Date(scheduledAt);
    const endTime = new Date(startTime.getTime() + 50 * 60 * 1000);

    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary: `Sessão - ${patientName || "Paciente"}`,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const meetLink = event.data.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === "video"
    )?.uri;

    return new Response(
      JSON.stringify({ meetLink: meetLink || null, eventId: event.data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating Meet link:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
