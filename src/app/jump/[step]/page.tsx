"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { VERSE_JUMP_1, VERSE_JUMP_2, TIER_DISTRIBUTION } from "@/lib/constants";
import { getSession, setSession } from "@/lib/store";
import type { VerseChoice } from "@/types";

export default function VerseJump() {
  const params = useParams();
  const router = useRouter();
  const step = Number(params.step);
  const [selected, setSelected] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/");
    }
  }, [router]);

  if (step !== 1 && step !== 2) {
    router.replace("/");
    return null;
  }

  const choices: VerseChoice[] = step === 1 ? VERSE_JUMP_1 : VERSE_JUMP_2;

  function handleSelect(index: number) {
    if (selected !== null) return;
    setSelected(index);

    const session = getSession();
    if (!session) return;

    const choice = choices[index];

    // 글리치 트랜지션 시작
    setTimeout(() => setTransitioning(true), 300);

    if (step === 1) {
      setSession({ ...session, score1: choice.score });
      setTimeout(() => router.push("/jump/2"), 1200);
    } else {
      const totalScore = (session.score1 ?? 0) + choice.score;
      const tierDist = TIER_DISTRIBUTION[totalScore];
      setSession({ ...session, score2: choice.score });

      const searchParams = new URLSearchParams({
        score: String(totalScore),
        t1: String(tierDist.tier1),
        t2: String(tierDist.tier2),
        t3: String(tierDist.tier3),
      });
      setTimeout(() => router.push(`/loading?${searchParams}`), 1200);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* 글리치 트랜지션 오버레이 */}
      <AnimatePresence>
        {transitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 pointer-events-none"
          >
            {/* 수평 글리치 슬라이스 */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, opacity: 0 }}
                animate={{
                  x: [0, (i % 2 === 0 ? 1 : -1) * (20 + Math.random() * 40), 0, (i % 2 === 0 ? -1 : 1) * 15, 0],
                  opacity: [0, 1, 1, 1, 0],
                }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.03,
                  ease: "easeInOut",
                }}
                style={{ top: `${i * 12.5}%`, height: "12.5%" }}
                className="absolute left-0 right-0 bg-accent/[0.08]"
              />
            ))}
            {/* 전체 화면 페이드 투 블랙 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="absolute inset-0 bg-bg"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[400px] flex flex-col items-center gap-10">
        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`w-8 h-1 rounded-full transition-colors ${
                s <= step ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Question */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-[12px] text-accent font-semibold tracking-wider uppercase mb-3">
            Verse Jump #{step}
          </p>
          <h2 className="text-[24px] font-[family-name:var(--font-instrument)] leading-tight">
            차원을 넘기 위해
            <br />
            무엇을 하시겠습니까?
          </h2>
        </motion.div>

        {/* Choices */}
        <div className="w-full flex flex-col gap-3">
          {choices.map((choice, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 * (i + 1) }}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className={`w-full p-4 rounded-[12px] border text-left text-[15px] leading-relaxed transition-all ${
                selected === i
                  ? "border-accent bg-accent/10 text-accent"
                  : selected !== null
                    ? "border-border/50 text-text-secondary/50"
                    : "border-border bg-surface hover:border-accent/50 text-text-primary"
              }`}
            >
              <span className="text-[11px] text-text-secondary block mb-1">
                {choice.score === 1
                  ? "약간 이상함"
                  : choice.score === 2
                    ? "상당히 이상함"
                    : "통계적 불가능"}
              </span>
              {choice.text}
            </motion.button>
          ))}
        </div>
      </div>
    </main>
  );
}
