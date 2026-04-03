"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Result, Universe } from "@/types";

declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (options: Record<string, unknown>) => void;
      };
    };
  }
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [result, setResult] = useState<Result | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const pollStarted = useRef(false);

  useEffect(() => {
    if (pollStarted.current) return;
    pollStarted.current = true;

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      const { data, error } = await supabase
        .from("results")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
        return;
      }
      setResult(data as Result);

      // 이미지가 아직 다 준비되지 않았으면 polling
      const readyCount = (data.universes as Universe[]).filter(
        (u) => u.image_url !== ""
      ).length;

      if (readyCount < 5) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const pollStart = Date.now();
        const POLL_TIMEOUT = 120_000; // 2분 후 polling 중단
        pollTimer = setInterval(async () => {
          // 타임아웃: 2분 후 중단
          if (Date.now() - pollStart > POLL_TIMEOUT) {
            if (pollTimer) clearInterval(pollTimer);
            return;
          }
          try {
            const res = await fetch(
              `${supabaseUrl}/functions/v1/poll?id=${id}`
            );
            if (!res.ok) return;
            const pollData = await res.json();

            setResult((prev) => {
              if (!prev) return prev;
              const updated = prev.universes.map((u, i) => ({
                ...u,
                image_url: pollData.universes[i]?.image_url || u.image_url,
              }));
              return { ...prev, universes: updated };
            });

            if (pollData.done && pollTimer) {
              clearInterval(pollTimer);
            }
          } catch {
            // polling 실패 무시
          }
        }, 3000);
      }
    }

    load();

    // 소유권 확인
    try {
      const owned = JSON.parse(sessionStorage.getItem("owned_results") || "[]");
      setIsOwner(owned.includes(id));
    } catch {}

    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [id]);

  const kakaoInitialized = useRef(false);

  // Kakao SDK 초기화
  useEffect(() => {
    if (kakaoInitialized.current) return;
    const timer = setInterval(() => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY!);
        kakaoInitialized.current = true;
        clearInterval(timer);
      } else if (window.Kakao?.isInitialized()) {
        kakaoInitialized.current = true;
        clearInterval(timer);
      }
    }, 300);
    return () => clearInterval(timer);
  }, []);

  function handleReJump() {
    router.push("/jump/1");
  }

  function handleKakaoShare() {
    const url = `${window.location.origin}/result/${id}`;
    const firstImage = result?.universes.find((u) => u.image_url)?.image_url;

    if (!window.Kakao?.isInitialized()) {
      handleShare();
      return;
    }

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `${result?.name}의 멀티버스`,
        description: "5개 평행세계에서의 나를 만나보세요",
        imageUrl: firstImage || "",
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [
        {
          title: "멀티버스 보기",
          link: { mobileWebUrl: url, webUrl: url },
        },
        {
          title: "내 멀티버스 만들기",
          link: {
            mobileWebUrl: `${window.location.origin}`,
            webUrl: `${window.location.origin}`,
          },
        },
      ],
    });
  }

  async function handleDownload(imageUrl: string, universeName: string) {
    try {
      // Supabase Storage는 CORS가 제한적이므로 proxy 방식 사용
      const res = await fetch(imageUrl, { mode: "cors" });
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result?.name}-${universeName}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // CORS 실패 시: 새 탭에서 이미지 직접 열기 (사용자가 길게 누르거나 우클릭으로 저장)
      const a = document.createElement("a");
      a.href = imageUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = `${result?.name}-${universeName}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  async function handleDeleteAll() {
    if (!confirm("모든 이미지와 결과가 영구적으로 삭제됩니다. 계속할까요?")) return;

    setDeleting(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setDeleted(true);
      }
    } catch {
      alert("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/result/${id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${result?.name}의 멀티버스`,
          text: "5개 평행세계에서의 나를 만나보세요",
          url,
        });
        return;
      } catch {
        // 사용자가 취소한 경우
      }
    }

    await navigator.clipboard.writeText(url);
    setShareMessage("링크가 복사되었습니다!");
    setTimeout(() => setShareMessage(null), 2000);
  }

  if (deleted) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-[16px] text-text-primary">데이터가 삭제되었습니다.</p>
        <p className="text-[13px] text-text-secondary text-center">
          모든 이미지와 결과가 영구적으로 삭제되었습니다.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-2 px-6 py-3 rounded-full bg-gradient-to-br from-accent to-[#ff8f65] text-white text-[14px] font-medium"
        >
          새로운 멀티버스 열기
        </button>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-[16px] text-text-secondary">
          이 차원은 존재하지 않거나 만료되었습니다.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-full bg-gradient-to-br from-accent to-[#ff8f65] text-white text-[14px] font-medium"
        >
          새로운 멀티버스 열기
        </button>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-8">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-[28px] font-[family-name:var(--font-instrument)] title-gradient">
            {result.name}의 멀티버스
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            {result.universes.filter((u: Universe) => u.image_url).length}/5 우주 생성 완료
          </p>
        </motion.div>

        {/* Universe Grid */}
        <div className="grid grid-cols-2 gap-3">
          {result.universes.map((universe: Universe, i: number) => {
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i }}
                onClick={() => {
                  if (universe.image_url) {
                    router.push(`/reveal?id=${id}&start=${i}`);
                  }
                }}
                className={`aspect-square rounded-[16px] overflow-hidden relative ${
                  i === 0 ? "col-span-2 aspect-video" : ""
                } ${universe.image_url ? "cursor-pointer" : ""}`}
              >
                {universe.image_url ? (
                  <>
                    <img
                      src={universe.image_url}
                      alt={`${universe.name} - ${universe.theme}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(universe.image_url, universe.name);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-bg/60 backdrop-blur-sm flex items-center justify-center text-[14px] hover:bg-bg/80 transition-colors"
                      title="이미지 저장"
                    >
                      ↓
                    </button>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-[13px] font-bold truncate">
                        {universe.name}
                      </p>
                      <p className="text-[11px] text-text-secondary truncate">
                        {universe.theme}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-surface flex flex-col items-center justify-center">
                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px] text-text-secondary mt-2">
                      이미지 생성 중...
                    </span>
                    <p className="text-[11px] text-text-secondary/50 mt-1 px-3 text-center truncate">
                      {universe.name}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Actions (소유자만) */}
        {isOwner && (
        <div className="flex flex-col gap-3">
          <button
            onClick={handleReJump}
            className="w-full py-3 rounded-full border border-border text-text-secondary text-[14px] hover:border-text-primary hover:text-text-primary transition-colors"
          >
            ↻ 다시 만들기
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleKakaoShare}
              className="flex-1 py-3 rounded-full bg-[#FEE500] text-[#191919] text-[14px] font-medium hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(254,229,0,0.3)] transition-all"
            >
              카카오톡 공유
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-3 rounded-full bg-gradient-to-br from-accent to-[#ff8f65] text-white text-[14px] font-medium hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,107,53,0.3)] transition-all"
            >
              링크 복사
            </button>
          </div>
          {shareMessage && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[12px] text-success text-center"
            >
              {shareMessage}
            </motion.p>
          )}
        </div>
        )}

        {/* CTA for visitors */}
        <div className="text-center py-4 border-t border-border">
          <p className="text-[14px] text-text-secondary">
            당신의 평행세계도 확인해보세요
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-2 text-accent text-[14px] font-semibold"
          >
            내 멀티버스 열기 →
          </button>
        </div>

        {/* 데이터 삭제 (소유자만) */}
        {isOwner && (
          <div className="text-center pb-6">
            <button
              onClick={handleDeleteAll}
              disabled={deleting}
              className="text-[12px] text-text-secondary border border-border/60 rounded-full px-4 py-1.5 hover:text-error hover:border-error/50 transition-colors disabled:opacity-50"
            >
              {deleting ? "삭제 중..." : "내 데이터 삭제하기"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
