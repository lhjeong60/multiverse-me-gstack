import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const url = new URL(req.url);
    const resultId = url.searchParams.get("id");

    if (!resultId) {
      return new Response(
        JSON.stringify({ error: "id 파라미터가 필요합니다." }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("results")
      .select("universes")
      .eq("id", resultId)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: "결과를 찾을 수 없습니다." }),
        { status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const universes = data.universes as Array<{
      name: string;
      theme: string;
      story: string;
      tier: number;
      prompt: string;
      image_url: string;
    }>;

    const readyCount = universes.filter((u) => u.image_url !== "").length;
    const done = readyCount === universes.length;

    return new Response(
      JSON.stringify({
        universes,
        ready_count: readyCount,
        done,
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Poll error:", err);
    return new Response(
      JSON.stringify({ error: "조회 실패" }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
