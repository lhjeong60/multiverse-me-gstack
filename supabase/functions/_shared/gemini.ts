const GEMINI_API_KEY = () => Deno.env.get("GEMINI_API_KEY")!;

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-3.1-flash-image-preview";

interface TierDistribution {
  tier1: number;
  tier2: number;
  tier3: number;
}

interface UniverseText {
  name: string;
  theme: string;
  story: string;
  tier: 1 | 2 | 3;
  image_prompt: string;
}

// 텍스트 생성: 5개 우주 설정 + 스토리 + 이미지 프롬프트
export async function generateUniverseTexts(
  userName: string,
  score: number,
  tierDist: TierDistribution
): Promise<UniverseText[]> {
  const prompt = `너는 영화 "Everything Everywhere All at Once"의 세계관을 기반으로 평행세계를 만드는 크리에이티브 디렉터야.

사용자 이름: ${userName}
개연성 역전 점수: ${score}/6 (높을수록 기상천외)
Tier 배분: Tier1(현실적) ${tierDist.tier1}개, Tier2(판타지) ${tierDist.tier2}개, Tier3(기상천외) ${tierDist.tier3}개

총 5개의 평행세계를 만들어줘. 각 Tier별 개수를 정확히 맞춰.

각 우주에 대해:
- name: 우주의 한국어 이름 (예: "네온시티의 해커")
- theme: 한 줄 세계관 설명
- story: ${userName}의 이 우주에서의 삶을 3줄로 서술 (한국어, 시적이고 영화적인 톤)
- tier: 1, 2, 또는 3
- image_prompt: 영어로 된 이미지 생성 프롬프트. "A portrait photo of a person as [역할] in [환경]. [구체적 비주얼 디테일]. Cinematic lighting, detailed, photorealistic." 형식. 절대 이름이나 성별을 명시하지 마.

Tier 가이드:
- Tier 1 (현실적): 실제로 있을 법한 평행세계. 다른 나라에서 태어났거나, 다른 직업을 택한 나. 예: "나폴리 피자집 3대째 사장", "알래스카 크랩잡이 어선 선장", "서울 지하철 안내방송 성우"
- Tier 2 (판타지): 실제 역사 속 특이한 시대/장소 + 거기서 가장 뜬금없는 평범한 직업. Tier 3과 같은 공식: 세계가 특이한 거지, 내 역할이 특이한 게 아님. 갭에서 웃음이 나와야 함.
  좋은 예: "바이킹 습격단의 회계사", "고대 로마 검투사 경기장 매점 알바", "칭기즈칸 원정대의 통역 인턴", "조선시대 궁중 PT 트레이너", "타이타닉호 3등실 룸서비스 담당"
  나쁜 예 (금지): "용을 타는 기사", "마법의 숲 수호자", "고대 왕국의 현자", "별을 항해하는 탐험가" — 전부 판타지 소설 표지에 나올 법한 뻔한 설정. 이런 거 쓰면 안 됨.
- Tier 3 (기상천외): 물리적 조건 하나가 바보같이 바뀐 세계 + 그 안에서의 평범한 삶. 반드시 지켜야 할 규칙:
  1) 변형은 딱 하나, 눈에 보이는 것. 추상적 개념(감정, 기억, 시간, 의식) 금지. 만질 수 있는 것만.
  2) 직업/역할은 그 세계에서 당연히 있을 법한 평범한 것.
  3) 한 문장에 그림이 그려져야 함. 설명이 필요하면 실패.
  좋은 예: "손가락이 핫도그인 세계의 네일아티스트", "모든 게 돌인 세계의 돌", "사람 키가 15cm인 세계의 고양이 조련사", "중력이 옆으로 작용하는 세계의 이사짐센터 직원", "온 세상이 풍선으로 된 세계의 칼 장인"
  나쁜 예 (금지): "감정이 보이는 세계", "기억이 화폐인 세계", "꿈이 현실이 되는 세계", "소리가 물질인 세계" — 전부 추상적이고 SF소설 컨셉임. 이런 거 쓰면 안 됨.

금지 장르/컨셉: 스팀펑크, 사이버펑크, 포스트아포칼립스, 디스토피아, 매트릭스, 가상현실, AI반란, 좀비, 뱀파이어, 마법학교. SF 창작물의 단골 설정 전부 금지. 이미 누군가 만든 세계관을 빌려오지 마.

JSON 배열로만 응답해. 다른 텍스트 없이.
[{"name":"...","theme":"...","story":"...","tier":1,"image_prompt":"..."},...]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.0,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini text gen failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.candidates[0].content.parts[0].text;
  return JSON.parse(text) as UniverseText[];
}

// 이미지 생성: 사용자 사진 + 프롬프트 → 우주 초상화 (실패 시 1회 재시도)
export async function generateUniverseImage(
  photoBase64: string,
  imagePrompt: string
): Promise<string> {
  const base64Data = photoBase64.includes(",")
    ? photoBase64.split(",")[1]
    : photoBase64;

  const mimeType = photoBase64.includes("image/png")
    ? "image/png"
    : "image/jpeg";

  async function attempt(): Promise<string> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `IMPORTANT: The attached photo is the REFERENCE FACE. The generated image MUST be based on this person's face. Study the face shape, eyes, nose, mouth, and skin tone carefully before generating.\n\nNow generate a creative portrait: ${imagePrompt}. Keep roughly 60-70% facial resemblance (face shape, skin tone, eye shape) while freely changing hairstyle, expression, age, build, and styling to fit the universe. Prioritize cinematic atmosphere. Output a single image.`,
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            temperature: 0.8,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini image gen failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    const parts = data.candidates[0].content.parts;

    const imagePart = parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
    );
    if (!imagePart) {
      throw new Error("No image returned from Gemini");
    }

    return imagePart.inlineData.data;
  }

  // 1회 재시도
  try {
    return await attempt();
  } catch (err) {
    console.warn("Image gen failed, retrying once:", err);
    await new Promise((r) => setTimeout(r, 1000));
    return await attempt();
  }
}
