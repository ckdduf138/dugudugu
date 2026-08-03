# 두구두구 (Dugudugu)

간단한 항목이나 인원만 고르면 뽑기, 사다리타기, 경주를 짧은 게임 연출로 즐길 수 있는 랜덤 결정 아케이드입니다. 결과는 시드 기반으로 먼저 확정되고, 3D 또는 2D 애니메이션은 그 결과를 재생합니다. 예전 결과 URL은 계속 재현되지만, 의미 없는 URL 복사만 제공하던 공통 공유 버튼은 결과 화면에서 노출하지 않습니다.

## 현재 게임

- 캡슐 뽑기: Blender에서 제작한 전용 가챠 머신, 캡슐 믹스/배출/오픈 컷신
- 사다리타기: 양끝 포털과 보드 내 직접 편집, 동물 얼굴을 눌러 한 명씩
  내려보내는 2D 경로 추적
- 동물 경주: 호랑이·말·사슴·강아지·고양이·펭귄·닭 중 2–7마리,
  기본 3마리, 32m 트랙, 이동거리 기반 보폭 동기화와 약 13초의 시드
  기반 역전 곡선
- 포츈쿠키: 네 가지 카테고리와 KO/EN 각각 100개 문구, 한 번 눌러
  갈라지는 Blender 모션, 살짝 구겨진 종이 결과 띠

한국어와 영어를 지원하며 `output: "export"`로 완전한 정적 사이트를 생성합니다.

## 실행

```bash
pnpm install
pnpm dev
pnpm lint
pnpm test
pnpm build
```

`pnpm build` 결과는 `out/`에 생성됩니다. 배포 시 `NEXT_PUBLIC_SITE_URL`을 실제 도메인으로 설정해야 canonical/JSON-LD URL이 정확해집니다.

## 구조

```text
app/[locale]/            정적 페이지와 메타데이터
components/game-shell/   모바일 bottom sheet, 결과 dialog, skip, live region
components/scene/        공통 R3F Canvas와 adaptive DPR/WebGL fallback
games/<id>/              순수 로직, Zustand 상태, 레거시 URL 인코딩, 3D 화면
lib/game/                rAF 컷신 타임라인과 immutable round snapshot
lib/design-tokens.ts     CSS 토큰의 WebGL용 concrete mirror
messages/                KO/EN 카피
public/models/           최적화된 런타임 GLB
scripts/blender/         재현 가능한 Blender 원본 생성 파이프라인
```

새 게임은 `games/registry.ts`와 `games/scenes.tsx`에 등록하고, 순수 결과 로직과 시드 재현 테스트를 먼저 추가합니다. 한 게임 화면에는 WebGL Canvas를 하나만 두며, 결과가 확정된 뒤에는 렌더 루프를 정지합니다.

## 3D 에셋 파이프라인

가챠 머신과 포츈쿠키는 다음 명령으로 다시 생성할 수 있습니다.

```bash
blender -b --python scripts/blender/build_gacha.py
blender -b --python scripts/blender/build_fortune_cookie.py
blender -b --python scripts/blender/build_ithappy_race_animals.py
```

런타임 모델의 안정적인 노드 이름은 각 게임의 `AGENTS.md`와 빌드
스크립트에 정의되어 있으므로 애니메이션 코드와 함께 변경해야 합니다.

경주 동물은 ITHappy Studios Animals Free의 일곱 리그를 하나의 공유 텍스처
GLB로 통합합니다. 라이선스와 출처는 `public/models/THIRD_PARTY_ASSETS.md`에
보존하며, 배포 파일은 저장소의 크기 제한을 지킵니다.

에이전트 컨텍스트는 루트 `AGENTS.md` 다음, 수정할 폴더에서 가장 가까운
`AGENTS.md` 하나만 추가로 읽습니다. 게임별 모델 노드·모션 계약과 공통
셸/로비/UI 규칙을 분리해 불필요한 컨텍스트 로딩을 줄였습니다.

## 품질 원칙

- 결과 로직과 연출을 분리하고 같은 seed는 같은 결과를 냅니다.
- 모바일 390px, 키보드 접근성, `prefers-reduced-motion`, 컷신 건너뛰기를 기본 조건으로 봅니다.
- 공통 색상/반경/그림자는 `app/globals.css` 토큰을 사용합니다.
- 투명 Canvas 위 transmission 재질과 라이브 WebGL 위 `backdrop-filter`를 사용하지 않습니다.
- 새 AI/MCP 도구는 버전 고정, 로컬 바인딩, 텔레메트리 비활성화, 라이선스 확인 뒤 제작 파이프라인에만 넣습니다.
