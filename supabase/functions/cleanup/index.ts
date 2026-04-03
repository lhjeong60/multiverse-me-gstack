import { createServiceClient } from "../_shared/supabase.ts";

// pg_cron에서 매일 호출: 만료된 results의 Storage 이미지 삭제 + DB 행 삭제
Deno.serve(async () => {
  try {
    const supabase = createServiceClient();

    // 만료된 results 조회
    const { data: expired, error } = await supabase
      .from("results")
      .select("id, universes")
      .lt("expires_at", new Date().toISOString());

    if (error || !expired || expired.length === 0) {
      return new Response(
        JSON.stringify({ cleaned: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let cleaned = 0;

    for (const result of expired) {
      // Storage 이미지 삭제
      const filePaths = (result.universes as Array<{ image_url: string }>)
        .map((_, i) => `${result.id}/${i}.jpg`);

      await supabase.storage.from("universe-images").remove(filePaths);

      // DB 행 삭제
      await supabase.from("results").delete().eq("id", result.id);
      cleaned++;
    }

    // 오래된 rate_limits도 정리
    await supabase
      .from("rate_limits")
      .delete()
      .lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    return new Response(
      JSON.stringify({ cleaned }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
