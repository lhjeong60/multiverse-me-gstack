import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR, Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "../fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "100 900",
});

const notoSerifKR = Noto_Serif_KR({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Multiverse Me — 평행세계의 나를 만나다",
  description:
    "이름과 사진만 올리면, AI가 5개 평행세계에서의 당신을 보여줍니다. 영화 같은 차원 점프 경험.",
  openGraph: {
    title: "Multiverse Me — 평행세계의 나를 만나다",
    description: "5개 평행세계에서의 나를 만나보세요",
    siteName: "Multiverse Me",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${notoSerifKR.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-pretendard)]">
        {children}
        <script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
          crossOrigin="anonymous"
          async
        />
      </body>
    </html>
  );
}
