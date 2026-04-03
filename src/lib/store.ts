// 세션 상태 관리 (React context 없이 간단하게)
// 사진은 세션 동안 유지 ("다시 점프" 시 재업로드 불필요)

export interface SessionState {
  name: string;
  photo: string; // base64
  score1: number | null;
  score2: number | null;
}

const SESSION_KEY = "multiverse-session";
const UNLOCK_KEY = "multiverse-unlocked";

export function getSession(): SessionState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(state: SessionState) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// 우주 해금 상태 (localStorage, 기기별 영구 저장)
export function getUnlockedUniverses(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(UNLOCK_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addUnlockedUniverses(ids: string[]) {
  const current = getUnlockedUniverses();
  const merged = [...new Set([...current, ...ids])];
  localStorage.setItem(UNLOCK_KEY, JSON.stringify(merged));
}
