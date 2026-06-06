---
# DESIGN.md — gamelog (Discord-style design system)
# 출처: designmd.co/d/discord 참조 시도(봇 차단으로 접근 불가) → Discord 공식 브랜드 컬러
#       (discord.com/branding) 및 공개된 Discord 다크 테마 UI 토큰으로 재구성
name: gamelog-discord
mode: dark
color:
  brand:
    blurple: "#5865F2"        # primary action / 포커스 / 활성 상태
    blurple-hover: "#4752C4"
    blurple-active: "#3C45A5"
    green: "#57F287"
    yellow: "#FEE75C"
    fuchsia: "#EB459E"
    red: "#ED4245"
  background:
    primary: "#313338"        # 메인 콘텐츠 영역 (채팅 영역)
    secondary: "#2B2D31"      # 채널 사이드바
    secondary-alt: "#232428"  # 멤버 리스트
    tertiary: "#1E1F22"       # 서버 레일 (최좌측)
    floating: "#111214"       # 툴팁/팝오버
    input: "#383A40"          # 입력 필드
    modifier-hover: "#404249" # 리스트 아이템 hover
    modifier-selected: "#404249"
  text:
    normal: "#DBDEE1"
    muted: "#949BA4"
    faint: "#6D6F78"
    header-primary: "#F2F3F5"
    header-secondary: "#B5BAC1"
    link: "#00A8FC"
    on-brand: "#FFFFFF"
  status:
    online: "#23A55A"
    idle: "#F0B232"
    dnd: "#F23F43"
    danger: "#DA373C"
    offline: "#80848E"
typography:
  family:
    base: "'gg sans', 'Pretendard Variable', Pretendard, 'Noto Sans KR', 'Malgun Gothic', -apple-system, sans-serif"
    display: "동일 (weight 800–900으로 구분)"
    code: "'Consolas', 'Courier New', monospace"
  scale:
    xs: 11px      # 타임스탬프, 그룹 라벨 (uppercase, tracking 0.02em)
    sm: 13px      # 보조 텍스트, 채널명
    base: 15px    # 본문 (line-height 1.375)
    lg: 17px      # 섹션 제목
    xl: 20px      # 페이지 헤더
    "2xl": 24px   # 모달 제목
    "3xl": 32px   # 히어로/Wrapped
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700, black: 900 }
layout:
  server-rail: 72px           # 최좌측 파티(서버) 레일
  channel-sidebar: 240px      # 채널 목록
  member-list: 240px          # 우측 멤버 패널
  user-panel: 52px            # 사이드바 하단 유저 바
  content-max: 740px          # 본문 컬럼 최대폭
radius:
  server-icon: 50% → 16px (hover 시 squircle 전환, 200ms)
  card: 8px
  button: 4px      # Discord 버튼은 낮은 radius
  input: 8px
  pill: 9999px
  avatar: 50%
spacing: [4, 8, 12, 16, 20, 24, 32, 40]   # 4px 베이스 스케일
shadow:
  low: "0 1px 0 rgba(2,2,2,0.2)"
  medium: "0 4px 4px rgba(0,0,0,0.16)"
  high: "0 8px 16px rgba(0,0,0,0.24)"
motion:
  fast: 100ms ease-out        # hover
  base: 200ms ease            # 패널 전환, 서버 아이콘
  slow: 350ms cubic-bezier(0.25,1,0.5,1)  # 모달 pop-in
---

# gamelog 디자인 원칙 (Discord 스타일)

## 레이아웃 구조
Discord의 4컬럼 구조를 그대로 따른다:
`[서버 레일 72px] [채널 사이드바 240px] [메인 콘텐츠 flex-1] [멤버 리스트 240px]`
- 서버 레일 → **파티(그룹) 전환**, 채널 사이드바 → **기능 채널** (#오늘의-브이로그, #순간-포착 …)
- 멤버 리스트 → 파티원 온라인/게임중 상태. xl 미만에서 숨김, md 미만에서는 하단 탭 바.

## 컴포넌트 규칙
- **채널 아이템**: 높이 32px, radius 4px, 기본 `text-muted` → hover `bg-modifier-hover` + `text-normal`, 활성 시 `bg-modifier-selected` + `text-header-primary`
- **버튼**: 기본 blurple, hover 시 `blurple-hover` (배경만 변화, 위치 이동 없음), height 38px / small 32px
- **카드**: `bg-secondary` 위에 radius 8px, 테두리 없이 명도 단차로 구분
- **상태 점**: 아바타 우하단 10px 원, `bg-tertiary` 3px 링으로 펀칭
- **그룹 라벨**: 11px, uppercase, `text-muted`, bold
- **입력 필드**: `bg-input`, placeholder `text-faint`, 포커스 시 blurple 아웃라인 없음(Discord식 미니멀)

## 톤 & 무드
- 어두운 명도 단차(tertiary → secondary → primary)로 깊이를 만든다. 보더 최소화.
- 포인트 컬러는 blurple 하나만 주력으로, green/yellow/fuchsia/red는 상태·강조에만.
- 텍스트는 순백(#FFF) 금지 — header도 #F2F3F5까지만.
- 인터랙션은 가볍고 빠르게(100–200ms), 과한 그림자/글로우 금지.
