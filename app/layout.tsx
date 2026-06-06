import AppShell from "@/components/AppShell";
import { StoreProvider } from "@/lib/store";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gamelog — 같은 판, 더 가까운 우리",
  description:
    "친구들과 게임하는 순간을 초단위 클립으로 기록하면, 하루가 끝날 때 우리 파티의 '오늘의 게임 브이로그'가 자동으로 완성되는 프라이빗 게이머 소셜 앱",
};

export const viewport: Viewport = {
  themeColor: "#1E1F22",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
