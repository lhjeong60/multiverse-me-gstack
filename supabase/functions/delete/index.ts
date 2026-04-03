import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return new Response(
        JSON.stringify({ error: "id가 필요합니다." }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const supabase = createServiceClient();

    // 결과 조회
    const { data, error } = await supabase
      .from("results")
      .select("universes")
      .eq("id", id)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: "결과를 찾을 수 없습니다." }),
        { status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Storage에서 이미지 삭제
    const universes = data.universes as Array<{ image_url: string }>;
    const filePaths = universes
      .map((_, i) => `${id}/${i}.jpg`)
      .filter(Boolean);

    if (filePaths.length > 0) {
      await supabase.storage.from("universe-images").remove(filePaths);
    }

    // DB에서 결과 삭제
    await supabase.from("results").delete().eq("id", id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Delete error:", err);
    return new Response(
      JSON.stringify({ error: "삭제 실패" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
