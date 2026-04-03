import type { VerseChoice } from "@/types";

// 점수별 선택지 풀 — 매번 랜덤 3개 표시
const CHOICES_SCORE_1: VerseChoice[] = [
  { text: "지금 신발 왼오른을 바꿔 신으시겠습니까?", score: 1 },
  { text: "비 오는 날 우산을 접고 걸으시겠습니까?", score: 1 },
  { text: "엘리베이터에서 모르는 사람에게 윙크하시겠습니까?", score: 1 },
  { text: "지금 입고 있는 옷을 뒤집어 입으시겠습니까?", score: 1 },
  { text: "다음에 마주치는 사람에게 하이파이브를 요청하시겠습니까?", score: 1 },
  { text: "오늘 하루 존댓말과 반말을 반대로 쓰시겠습니까?", score: 1 },
  { text: "다음 전화를 속삭이는 목소리로 받으시겠습니까?", score: 1 },
  { text: "점심을 눈 감고 골라서 먹으시겠습니까?", score: 1 },
  { text: "이 자리에서 10초간 아무 말 없이 미소만 짓겠습니까?", score: 1 },
  { text: "지금 주머니에 있는 걸로 옆 사람에게 선물하시겠습니까?", score: 1 },
];

const CHOICES_SCORE_2: VerseChoice[] = [
  { text: "카페에서 주문을 노래로 하시겠습니까?", score: 2 },
  { text: "회의 중에 책상 위로 올라가시겠습니까?", score: 2 },
  { text: "지하철에서 내릴 때 춤을 추며 나가시겠습니까?", score: 2 },
  { text: "편의점에서 계산할 때 연극 대사로 말하시겠습니까?", score: 2 },
  { text: "택시를 잡고 '따라와, 설명은 나중에' 라고 하시겠습니까?", score: 2 },
  { text: "메뉴판 없이 셰프에게 오늘의 운명을 맡기시겠습니까?", score: 2 },
  { text: "모르는 사람의 장보기 카트에 몰래 사탕을 넣으시겠습니까?", score: 2 },
  { text: "버스 맨 뒷자리에서 졸고 있는 사람 옆에 쪽지를 남기시겠습니까?", score: 2 },
  { text: "오늘 만나는 모든 사람에게 별명을 지어주시겠습니까?", score: 2 },
  { text: "가장 친한 친구에게 1시간 동안 경어만 쓰시겠습니까?", score: 2 },
];

const CHOICES_SCORE_3: VerseChoice[] = [
  { text: "길 가다 모르는 사람에게 프로포즈하시겠습니까?", score: 3 },
  { text: "공항에 가서 가장 먼저 뜨는 비행기를 타시겠습니까?", score: 3 },
  { text: "사직서를 내고 서커스단 오디션을 보시겠습니까?", score: 3 },
  { text: "전 재산을 동전으로 바꿔 분수에 던지시겠습니까?", score: 3 },
  { text: "눈 감고 지도를 찍어 그곳으로 이사하시겠습니까?", score: 3 },
  { text: "광화문 한복판에서 1인 뮤지컬을 공연하시겠습니까?", score: 3 },
  { text: "오늘부터 이름을 바꾸고 새 인생을 시작하시겠습니까?", score: 3 },
  { text: "모르는 할머니 댁에 찾아가 며느리라고 하시겠습니까?", score: 3 },
  { text: "퇴근길 지하철에서 즉석 스탠드업 코미디를 하시겠습니까?", score: 3 },
  { text: "내일 출근할 때 정장 대신 잠옷을 입고 가시겠습니까?", score: 3 },
];

// 각 점수에서 1개씩 랜덤 추출 → 3개 선택지
export function getRandomChoices(): VerseChoice[] {
  const pick = (arr: VerseChoice[]) => arr[Math.floor(Math.random() * arr.length)];
  return [pick(CHOICES_SCORE_1), pick(CHOICES_SCORE_2), pick(CHOICES_SCORE_3)];
}

// 하위 호환용 (기존 import 유지)
export const VERSE_JUMP_1 = CHOICES_SCORE_1.slice(0, 3).map((c, i) => ({ ...c, score: i + 1 }));
export const VERSE_JUMP_2 = CHOICES_SCORE_2.slice(0, 3).map((c, i) => ({ ...c, score: i + 1 }));

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
  "동시에 모든 곳에...",
  "빨래방 우주 통과 중...",
  "핫도그 손가락 서명 중...",
  "돌멩이로 존재하는 중...",
  "세금 감사 우주 탈출 중...",
  "양자 상태 측정 중...",
  "평행세계 비자 발급 중...",
  "차원 균열 안정화 중...",
  "너구리 셰프 레시피 수집 중...",
  "절벽에서 굴러가는 중...",
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png";
export const DAILY_LIMIT_PER_IP = 3;
export const DAILY_LIMIT_GLOBAL = 500;
