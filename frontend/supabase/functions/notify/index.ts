// supabase/functions/notify/index.ts
// Placeholder "notify" function (e.g., called by a cron later)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    // TODO: look up expiring items and send Web Push
    const payload = {
      ok: true,
      dryRun: !!body?.dryRun,
      sentCount: 0,
      note: "Placeholder notify function",
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("/notify error:", err);
    return new Response(
      JSON.stringify({ error: "Notify failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
