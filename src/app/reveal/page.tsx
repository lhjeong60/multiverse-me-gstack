"use client";

import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { addUnlockedUniverses } from "@/lib/store";
import type { Result, Universe } from "@/types";

function RevealContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resultId = searchParams.get("id");
  const startIndex = Number(searchParams.get("start") || 0);

  const [result, setResult] = useState<Result | null>(null);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [reportedImages, setReportedImages] = useState<Set<number>>(new Set());
  const pollStarted = useRef(false);
  const [showStory, setShowStory] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [allDone, setAllDone] = useState(false);

  // 결과 로드 + 이미지 polling
  useEffect(() => {
    if (!resultId) {
      router.replace("/");
      return;
    }
    if (pollStarted.current) return;
    pollStarted.current = true;

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function loadResult() {
      const { data, error } = await supabase
        .from("results")
        .select("*")
        .eq("id", resultId)
        .single();

      if (error || !data) {
        router.replace("/");
        return;
      }

      setResult(data as Result);

      const universeIds = (data.universes as Universe[]).map(
        (u) => `${data.id}-${u.name}`
      );
      addUnlockedUniverses(universeIds);

      // 아직 모든 이미지가 준비되지 않았으면 polling 시작
      const readyCount = (data.universes as Universe[]).filter(
        (u) => u.image_url !== ""
      ).length;

      if (readyCount < 5) {
        const pollStart = Date.now();
        const POLL_TIMEOUT = 120_000;
        pollTimer = setInterval(async () => {
          if (Date.now() - pollStart > POLL_TIMEOUT) {
            setAllDone(true);
            if (pollTimer) clearInterval(pollTimer);
            return;
          }
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          try {
            const res = await fetch(
              `${supabaseUrl}/functions/v1/poll?id=${resultId}`
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

            if (pollData.done) {
              setAllDone(true);
              if (pollTimer) clearInterval(pollTimer);
            }
          } catch {
            // polling 실패는 무시
          }
        }, 3000);
      } else {
        setAllDone(true);
      }
    }

    loadResult();

    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [resultId, router]);

  // 이미지 완료 순 고정 정렬: 한 번 순서에 들어간 우주는 위치 안 바뀜
  const orderedIndicesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!result) return;
    // startIndex > 0이면 result에서 특정 우주 클릭해서 온 것 → 원래 순서 유지
    if (startIndex > 0 && orderedIndicesRef.current.length === 0) {
      orderedIndicesRef.current = result.universes.map((_, i) => i);
      return;
    }
    // 이미지가 새로 완료된 우주만 기존 순서 뒤에 append
    const current = new Set(orderedIndicesRef.current);
    result.universes.forEach((u, i) => {
      if (u.image_url && !current.has(i)) {
        orderedIndicesRef.current = [...orderedIndicesRef.current, i];
      }
    });
    // 아직 이미지 없는 우주는 맨 뒤에 (순서 유지)
    const ordered = new Set(orderedIndicesRef.current);
    result.universes.forEach((_, i) => {
      if (!ordered.has(i)) {
        // 아직 추가 안 된 우주는 뒤에 대기 (표시용)
      }
    });
  }, [result, startIndex]);

  // 전체 인덱스 목록: 확정된 순서 + 아직 이미지 없는 우주
  const sortedIndices = useMemo(() => {
    if (!result) return [];
    const ordered = new Set(orderedIndicesRef.current);
    const remaining = result.universes
      .map((_, i) => i)
      .filter((i) => !ordered.has(i));
    return [...orderedIndicesRef.current, ...remaining];
  }, [result]);

  const actualIndex = sortedIndices[currentIndex] ?? 0;
  const currentUniverse = result?.universes[actualIndex];
  const currentStory = currentUniverse?.story ?? "";

  // 타이핑 효과: story 텍스트와 index 변경에만 반응
  useEffect(() => {
    if (!currentStory || !showStory) return;

    setDisplayedText("");
    let i = 0;

    const interval = setInterval(() => {
      if (i < currentStory.length) {
        setDisplayedText(currentStory.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [currentStory, showStory, currentIndex]);

  const handleImageLoad = useCallback(() => {
    setTimeout(() => setShowStory(true), 400);
  }, []);

  // 이미지 없어도 스토리는 바로 보여주기
  useEffect(() => {
    if (!currentUniverse || showStory) return;
    if (!currentUniverse.image_url) {
      const timer = setTimeout(() => setShowStory(true), 600);
      return () => clearTimeout(timer);
    }
  }, [currentUniverse, showStory]);

  function goNext() {
    if (!result || currentIndex >= result.universes.length - 1) {
      router.push(`/result/${result?.id}`);
      return;
    }
    setShowStory(false);
    setDisplayedText("");
    setCurrentIndex((prev) => prev + 1);
  }

  function goPrev() {
    if (currentIndex <= 0) return;
    setShowStory(false);
    setDisplayedText("");
    setCurrentIndex((prev) => prev - 1);
  }

  if (!result || !currentUniverse) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const tierLabel =
    currentUniverse.tier === 1
      ? "현실적"
      : currentUniverse.tier === 2
        ? "판타지"
        : "기상천외";

  return (
    <main className="flex flex-1 flex-col relative overflow-hidden">
      <div className="relative w-full" style={{ height: "60vh" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.15, filter: "brightness(2) blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "brightness(1) blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, filter: "brightness(0.5)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {currentUniverse.image_url ? (
              <img
                src={currentUniverse.image_url}
                alt={`${currentUniverse.name} - ${currentUniverse.theme}`}
                className="w-full h-full object-cover"
                onLoad={handleImageLoad}
              />
            ) : (
              <div className="w-full h-full bg-surface flex items-center justify-center">
                <p className="text-text-secondary text-[14px] glitch-text">
                  차원 스캔 중...
                </p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute top-4 right-4 text-[12px] text-text-secondary bg-bg/60 px-3 py-1 rounded-full backdrop-blur-sm">
          {currentIndex + 1} / {result.universes.length}
        </div>
      </div>

      <div className="flex-1 px-6 py-5 flex flex-col gap-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <span className="inline-block text-[10px] tracking-widest uppercase text-accent3 border border-accent3/30 px-3 py-1 rounded-full">
              {tierLabel}
            </span>
            <h2 className="text-2xl mt-2 font-[family-name:var(--font-instrument)] leading-tight">
              {currentUniverse.name}
            </h2>
            <p className="text-[13px] text-text-secondary mt-1">
              {currentUniverse.theme}
            </p>

            <div className="mt-4 min-h-[60px]">
              <p className="text-[15px] leading-[1.7] font-[family-name:var(--font-noto-serif)]">
                {displayedText}
                {showStory &&
                  displayedText.length < (currentUniverse.story?.length ?? 0) && (
                    <span className="typing-cursor" />
                  )}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-center gap-6 mt-auto pb-4">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className={`px-6 py-3 border rounded-full text-[13px] transition ${
              currentIndex === 0
                ? "border-border text-text-secondary/30 cursor-not-allowed"
                : "border-border text-text-secondary hover:border-text-primary hover:text-text-primary"
            }`}
          >
            ← 이전 세계
          </button>
          <span className="text-text-secondary text-[13px]">
            {currentIndex + 1} / {result.universes.length}
          </span>
          <button
            onClick={goNext}
            className="px-6 py-3 border border-accent text-accent rounded-full text-[13px] transition hover:bg-accent hover:text-white"
          >
            {currentIndex === result.universes.length - 1
              ? "결과 보기"
              : "다음 세계 →"}
          </button>
        </div>

        {startIndex > 0 && (
          <div className="text-center">
            <button
              onClick={() => router.push(`/result/${resultId}`)}
              className="text-[12px] text-text-secondary hover:text-text-primary transition-colors"
            >
              결과 화면으로 돌아가기
            </button>
          </div>
        )}

        {currentUniverse.image_url && (
          <div className="text-center pb-2">
            {!reportedImages.has(currentIndex) ? (
              <button
                onClick={() => {
                  setReportedImages((prev) => new Set(prev).add(currentIndex));
                  console.log(`[feedback] face-mismatch: result=${resultId} universe=${currentIndex}`);
                }}
                className="text-[12px] text-text-secondary border border-border/60 rounded-full px-4 py-1.5 hover:text-text-primary hover:border-text-secondary transition-colors"
              >
                내 얼굴 같지 않나요? 알려주세요
              </button>
            ) : (
              <p className="text-[12px] text-accent3/60">감사합니다!</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function Reveal() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <RevealContent />
    </Suspense>
  );
}
