"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { RIFT_MESSAGES } from "@/lib/constants";
import { getSession } from "@/lib/store";

function LoadingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);
  const done = useRef(false);

  const score = Number(searchParams.get("score"));
  const tierDist = {
    tier1: Number(searchParams.get("t1")),
    tier2: Number(searchParams.get("t2")),
    tier3: Number(searchParams.get("t3")),
  };

  // 로딩 텍스트 로테이션
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % RIFT_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // 프로그레스 바 (12초에 걸쳐 90%까지, 완료 시 100%)
  useEffect(() => {
    const start = Date.now();
    const duration = 12000;
    const tick = setInterval(() => {
      if (done.current) {
        setProgress(100);
        clearInterval(tick);
        return;
      }
      const elapsed = Date.now() - start;
      const ratio = Math.min(elapsed / duration, 1);
      // ease-out curve: 빠르게 시작, 90%에서 느려짐
      setProgress(Math.round(ratio * 90));
    }, 200);
    return () => clearInterval(tick);
  }, []);

  // Edge Function 호출
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const session = getSession();
    if (!session || !score) {
      router.replace("/");
      return;
    }

    async function generate() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const res = await fetch(`${supabaseUrl}/functions/v1/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: session!.name,
            photo: session!.photo,
            score,
            tier_distribution: tierDist,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "생성 실패");
        }

        const data = await res.json();
        const resultId = data.result_id;

        // 소유권 마킹 (이 브라우저에서 생성한 결과)
        try {
          const owned = JSON.parse(sessionStorage.getItem("owned_results") || "[]");
          owned.push(resultId);
          sessionStorage.setItem("owned_results", JSON.stringify(owned));
        } catch {};

        // 이미지 최소 1개 완료까지 polling 대기
        const pollForFirstImage = async (): Promise<void> => {
          const pollStart = Date.now();
          const TIMEOUT = 120_000;
          while (Date.now() - pollStart < TIMEOUT) {
            await new Promise((r) => setTimeout(r, 2000));
            try {
              const pollRes = await fetch(`${supabaseUrl}/functions/v1/poll?id=${resultId}`);
              if (!pollRes.ok) continue;
              const pollData = await pollRes.json();
              if (pollData.ready_count >= 1) return;
            } catch {
              // 재시도
            }
          }
        };

        await pollForFirstImage();
        done.current = true;
        setProgress(100);
        await new Promise((r) => setTimeout(r, 400));
        router.replace(`/reveal?id=${resultId}`);
      } catch (e) {
        console.error("Generate failed:", e);
        done.current = true;
        setError(e instanceof Error ? e.message : "차원 균열이 너무 심합니다.");
      }
    }

    generate();
  }, [router, score, tierDist]);

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-[16px] text-text-primary text-center">{error}</p>
        <button
          onClick={() => router.replace("/")}
          className="px-6 py-3 rounded-full bg-gradient-to-br from-accent to-[#ff8f65] text-white text-[14px] font-medium"
        >
          돌아가기
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* 차원 균열 배경 이펙트 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 균열에서 퍼지는 파동 */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 3],
              opacity: [0.15, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1,
              ease: "easeOut",
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-accent/30"
          />
        ))}
        {/* 수평 글리치 라인 (간헐적) */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={`line-${i}`}
            animate={{
              x: ["-100%", "100%"],
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              repeatDelay: 2 + i * 1.5,
              delay: i * 0.7,
            }}
            style={{ top: `${20 + i * 18}%` }}
            className="absolute left-0 w-full h-[1px] bg-accent2/20"
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-8 relative z-10">
        {/* 포탈 스피너 (기존 스피너 대체) */}
        <div className="relative w-16 h-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-[2px] border-transparent border-t-accent border-r-accent/30"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-1 rounded-full border-[2px] border-transparent border-b-accent2 border-l-accent2/30"
          />
          <motion.div
            animate={{ scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-3 rounded-full bg-accent/10"
          />
        </div>

        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="font-[family-name:var(--font-instrument)] text-lg sm:text-2xl text-center"
        >
          {RIFT_MESSAGES[messageIndex]}
        </motion.p>

        <div className="w-48 h-1 bg-border rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #ff6b35, #c4a1ff)" }}
          />
        </div>
        <p className="text-[12px] text-text-secondary/50">{progress}%</p>
      </div>
    </main>
  );
}

export default function Loading() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <LoadingContent />
    </Suspense>
  );
}
