import type { VerseChoice } from "@/types";

export const VERSE_JUMP_1: VerseChoice[] = [
  { text: "지금 신발 왼오른을 바꿔 신으시겠습니까?", score: 1 },
  { text: "카페에서 주문을 노래로 하시겠습니까?", score: 2 },
  { text: "길 가다 모르는 사람에게 프로포즈하시겠습니까?", score: 3 },
];

export const VERSE_JUMP_2: VerseChoice[] = [
  { text: "비 오는 날 우산 없이 걸으시겠습니까?", score: 1 },
  { text: "회의 중에 책상 위로 올라가시겠습니까?", score: 2 },
  { text: "지금 당장 공항에 가서 가장 먼저 뜨는 비행기를 타시겠습니까?", score: 3 },
];

// 합산 점수별 Tier 배분 (tier1, tier2, tier3)
export const TIER_DISTRIBUTION: Record<
  number,
  { tier1: number; tier2: number; tier3: number }
> = {
  2: { tier1: 3, tier2: 2, tier3: 0 },
  3: { tier1: 2, tier2: 2, tier3: 1 },
  4: { tier1: 1, tier2: 3, tier3: 1 },
  5: { tier1: 0, tier2: 2, tier3: 3 },
  6: { tier1: 0, tier2: 1, tier3: 4 },
};

// 차원 균열 로딩 텍스트 (EEAAO 패러디)
export const RIFT_MESSAGES = [
  "모든 곳에 동시에 존재하는 중...",
  "빨래방 우주를 지나는 중...",
  "너구리 요리사 차원에서 레시피 수집 중...",
  "핫도그 손가락으로 문서 서명 중...",
  "돌멩이가 된 당신을 절벽에서 굴리는 중...",
  "세금 감사 우주에서 탈출 중...",
  "모든 가능성을 동시에 계산하는 중...",
  "차원 균열이 안정화되는 중...",
  "당신의 양자 상태를 측정하는 중...",
  "평행세계 비자를 발급받는 중...",
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png";
export const DAILY_LIMIT_PER_IP = 3;
export const DAILY_LIMIT_GLOBAL = 500;
