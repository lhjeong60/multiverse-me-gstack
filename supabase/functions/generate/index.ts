import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import {
  generateUniverseTexts,
  generateUniverseImage,
} from "../_shared/gemini.ts";

interface RequestBody {
  name: string;
  photo: string;
  score: number;
  tier_distribution: { tier1: number; tier2: number; tier3: number };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const body: RequestBody = await req.json();
    const { name, photo, score, tier_distribution } = body;

    // 이름 sanitize: 개행 제거, 한글/영문/숫자/공백만 허용, 20자 제한
    const sanitizedName = (name || "")
      .replace(/[\n\r]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim()
      .slice(0, 20);

    // 입력 검증
    if (!sanitizedName || !photo || !score || !tier_distribution) {
      return new Response(
        JSON.stringify({ error: "필수 항목이 누락되었습니다." }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    if (score < 2 || score > 6) {
      return new Response(
        JSON.stringify({ error: "잘못된 점수입니다." }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const supabase = createServiceClient();

    // Rate limit 체크 (localhost에서는 스킵)
    const origin = req.headers.get("origin") || "";
    const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");

    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // IP + 이름 조합별 일일 사용량
    const { count: ipNameCount } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", clientIp)
      .eq("name", sanitizedName)
      .gte("created_at", todayStart.toISOString());

    if (!isLocalhost && (ipNameCount ?? 0) >= 3) {
      return new Response(
        JSON.stringify({
          error: `${sanitizedName}님은 오늘의 차원 점프를 모두 사용했습니다. 내일 다시 도전하세요.`,
        }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // 전체 일일 사용량
    const { count: globalCount } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    if (!isLocalhost && (globalCount ?? 0) >= 500) {
      return new Response(
        JSON.stringify({
          error: "오늘 너무 많은 차원이 열렸습니다. 내일 다시 와주세요.",
        }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Rate limit 기록
    await supabase.from("rate_limits").insert({ ip_address: clientIp, name: sanitizedName });

    // 1단계: 텍스트 생성 (우주 5개 설정 + 스토리 + 이미지 프롬프트)
    const universeTexts = await generateUniverseTexts(
      sanitizedName,
      score,
      tier_distribution
    );

    // 텍스트 완료 즉시 응답 → 이미지는 전부 백그라운드
    const resultId = crypto.randomUUID();

    const universes = universeTexts.map((u) => ({
      name: u.name,
      theme: u.theme,
      story: u.story,
      tier: u.tier,
      prompt: u.image_prompt,
      image_url: "",
    }));

    // DB에 결과 저장 (이미지 없는 상태)
    const { error: insertError } = await supabase.from("results").insert({
      id: resultId,
      name: sanitizedName,
      score,
      tier_distribution,
      universes,
    });

    if (insertError) {
      throw new Error(`DB insert failed: ${insertError.message}`);
    }

    // 이미지 5개 전부 백그라운드 생성
    const backgroundPromise = generateAllImages(
      supabase,
      resultId,
      photo,
      universeTexts,
      universes
    );

    backgroundPromise.catch((err) =>
      console.error("Background image gen failed:", err)
    );

    return new Response(
      JSON.stringify({
        result_id: resultId,
        universes,
        ready_count: 0,
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Generate error:", err);
    return new Response(
      JSON.stringify({
        error:
          err instanceof Error ? err.message : "차원 균열이 너무 심합니다.",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});

// 이미지 5개 백그라운드 생성 (첫 번째 즉시 + 나머지 2개씩 병렬)
async function generateAllImages(
  supabase: ReturnType<typeof createServiceClient>,
  resultId: string,
  photo: string,
  universeTexts: Array<{
    name: string;
    theme: string;
    story: string;
    tier: number;
    image_prompt: string;
  }>,
  universes: Array<{
    name: string;
    theme: string;
    story: string;
    tier: number;
    prompt: string;
    image_url: string;
  }>
) {
  // 5개 전부 병렬 생성 (Edge Function이 응답 후 종료될 수 있으므로 최대한 빨리)
  const results = await Promise.allSettled(
    universeTexts.map(async (text, i) => {
      const imageBase64 = await generateUniverseImage(photo, text.image_prompt);

      const imagePath = `${resultId}/${i}.jpg`;
      await supabase.storage
        .from("universe-images")
        .upload(imagePath, decode(imageBase64), {
          contentType: "image/jpeg",
          upsert: true,
        });

      const {
        data: { publicUrl },
      } = supabase.storage.from("universe-images").getPublicUrl(imagePath);

      // 개별 완료 즉시 DB 업데이트
      universes[i].image_url = publicUrl;
      await supabase
        .from("results")
        .update({ universes })
        .eq("id", resultId);

      return { index: i, url: publicUrl };
    })
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(`Image gen failed:`, result.reason);
    }
  }
}

// base64 → Uint8Array
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
