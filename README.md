# 🎮 gamelog — 같은 판, 더 가까운 우리

> **setlog의 게임 버전.** 친구들과 게임하는 순간을 초단위 클립으로 기록하면,
> 하루가 끝날 때 우리 파티의 '오늘의 게임 브이로그'가 자동으로 완성되는 프라이빗 게이머 소셜 앱.

[setlog](https://apps.apple.com/kr/app/setlog/id6587576438)(New Chat Inc.)을 역기획하고,
그 코어 루프(강제된 동시성 · 무편집 · 프라이빗 그룹)를 게이머 맥락으로 이식한 웹 데모입니다.

## ✨ 5가지 핵심 기능

| # | 채널 | 기능 |
|---|---|---|
| ① | `#오늘의-브이로그` | 한 판 끝나면 2~5초 클립 → 23시에 파티 분할화면 브이로그 자동 합성 (미리보기 플레이어 포함) |
| ② | `#potg` | "방금 그거! 🔥" 버튼으로 즉시 5초 Play of the Game 클립 + 이모지 리액션 |
| ③ | `#지금-뭐해` | 게이머 BeReal — 셀카 + 게임 화면 동시 체크인, 친구 판에 "나도 합류 🎮" (LFG) |
| ④ | `#wrapped` | **2026 Wrapped** 스토리 리캡 — 시즌 플레이 통계를 6장 슬라이드로 |
| ⑤ | `#데일리-퀘스트` | 매일 같은 미션, 4명의 다른 플레이 — 클립 인증 + 스트릭 🔥 |
| + | `#게임-피드` | Steam · OP.GG 계정 연동(접속/업적/전적/랭크) + 파티 클립(브이로그·POTG·퀘스트 인증)이 하나의 최신순 스트림으로 (연동부는 동일 스키마의 시뮬레이션, API 키 연결 시 실연동 가능) |

## 🎨 디자인

Discord 디자인 시스템을 따릅니다 — 토큰은 [`design.md`](./design.md) 참고.
(서버 레일 72px · 채널 사이드바 240px · 멤버 리스트 240px의 4컬럼 구조, blurple `#5865F2`)

## 🛠 기술 스택

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- 실제 카메라 촬영: `getUserMedia` + `MediaRecorder` (영상은 IndexedDB에 영속)
- 게임 화면 캡처: `getDisplayMedia`
- 상태: React Context + `localStorage` (서버리스 데모 — 백엔드 없음)
- 카메라가 없으면 이모지 클립으로 폴백

## 🚀 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

## 📄 기획 문서

- [`docs/01-setlog-역기획.md`](./docs/01-setlog-역기획.md) — setlog 조사 및 역기획
- [`docs/02-gamelog-기획서.md`](./docs/02-gamelog-기획서.md) — 방향성 5가지 + MVP 기획
