"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { MAX_FILE_SIZE, ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { setSession } from "@/lib/store";

export default function Landing() {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError("5MB 이하의 사진을 올려주세요.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPhoto(base64);
      setPhotoPreview(base64);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) {
      if (file.size > MAX_FILE_SIZE) {
        setError("5MB 이하의 사진을 올려주세요.");
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setPhoto(base64);
        setPhotoPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleStart() {
    if (!name.trim() || !photo) return;

    setSession({
      name: name.trim(),
      photo,
      score1: null,
      score2: null,
    });

    router.push("/jump/1");
  }

  const isReady = name.trim().length > 0 && photo !== null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative">
      {/* Background glow */}
      <div className="absolute w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,107,53,0.08)_0%,transparent_70%)] top-[10%] left-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="w-full max-w-[480px] flex flex-col items-center gap-6 relative z-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-4"
        >
          <h1 className="font-[family-name:var(--font-instrument)] text-[clamp(3rem,8vw,5rem)] tracking-tight title-gradient leading-[1.1]">
            Multiverse Me
          </h1>
          <p className="text-[13px] text-text-secondary tracking-[0.15em] uppercase mt-2">
            다른 세계의 나를 만나다
          </p>
        </motion.div>

        {/* Name Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full"
        >
          <input
            type="text"
            placeholder="이름을 입력하세요"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="w-full px-4 py-3.5 bg-surface border border-border rounded-lg text-[14px] text-text-primary placeholder:text-text-secondary/50 text-center outline-none focus:border-accent2 transition-colors"
          />
        </motion.div>

        {/* Photo Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full"
        >
          <AnimatePresence mode="wait">
            {photoPreview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full rounded-2xl border border-accent2 overflow-hidden"
              >
                <div className="relative aspect-square">
                  <img
                    src={photoPreview}
                    alt="선택된 사진"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex border-t border-accent2/30">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-3 text-[13px] text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transition"
                  >
                    다시 고르기
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="w-full aspect-[4/3] border border-dashed border-border bg-surface rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:border-accent hover:bg-accent/[0.03] group"
              >
                <div className="text-5xl mb-4 opacity-30 group-hover:opacity-50 transition-opacity">
                  📸
                </div>
                <p className="text-[14px] text-text-secondary">
                  <span className="text-accent font-medium">클릭</span>하거나
                  사진을 드래그하세요
                </p>
                <p className="text-[12px] text-text-secondary/60 mt-2">
                  정면 얼굴이 잘 보이는 사진이 좋아요
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            onChange={handleFileChange}
            onClick={(e) => {
              (e.target as HTMLInputElement).value = "";
            }}
            className="hidden"
          />
          {error && (
            <p className="text-[12px] text-error mt-2 text-center">{error}</p>
          )}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="w-full flex justify-center mt-2"
        >
          <button
            onClick={handleStart}
            disabled={!isReady}
            className={`px-10 py-4 rounded-full text-white font-medium tracking-wide transition-all ${
              isReady
                ? "bg-gradient-to-br from-accent to-[#ff8f65] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,107,53,0.3)] cursor-pointer"
                : "bg-gradient-to-br from-accent to-[#ff8f65] opacity-30 cursor-not-allowed"
            }`}
          >
            평행세계 열기 ✦
          </button>
        </motion.div>

        {/* Privacy notice */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-[11px] text-text-secondary/60 text-center leading-relaxed"
        >
          사진은 이미지 생성에만 사용되며 즉시 삭제됩니다.
          <br />
          결과는 30일 후 자동 삭제됩니다.
        </motion.p>
      </div>
    </main>
  );
}
