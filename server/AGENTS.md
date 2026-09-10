# server/AGENTS.md

## Module Context

Bun 런타임에서 도는 AI API 프록시. 클라이언트의 프롬프트를 받아 Anthropic 또는 Google로
중계하고, 응답 텍스트를 react-live가 실행할 수 있는 코드로 정규화해 돌려준다.

## Tech Stack & Constraints

- 런타임은 Bun이다. `Bun.serve`(index.ts:138)와 `bun --watch`를 쓴다. Express나 다른
  HTTP 프레임워크를 도입하지 마라.
- HTTP 클라이언트는 전역 `fetch`만 쓴다. axios 등 별도 라이브러리를 추가하지 마라.
- 이 디렉토리에 React를 import하지 마라. `.ts`만 있고 `.tsx`는 없다.

## Implementation Patterns

파일 역할이 부수효과 기준으로 갈린다. 새 코드를 어디에 둘지 이 기준으로 판단하라.

- `index.ts` — `Bun.serve`, 네트워크 호출, 환경변수. 테스트 없음.
- `generator.ts`, `fallback.ts` — 순수 함수. 각각 `.test.ts` 있음.

프로바이더를 추가할 때의 경로: `callXxxModel`(네트워크 한 번) → 필요하면 폴백 오케스트레이션
→ `Provider` 유니온 타입(index.ts:57)과 `ENV_KEYS`(index.ts:59-62)에 등록 → 클라이언트의
`PROVIDER_CONFIG`(src/App.tsx)에도 추가. 네 곳을 모두 건드려야 UI에 노출된다.

테스트는 `bun run test`로 실행되며 `server/**/*.test.ts`가 포함된다(vite.config.ts의 vitest
`include`). 순수 함수를 추가하면 테스트를 같이 추가하는 것이 이 디렉토리의 기존 방식이다.

## Local Golden Rules

### 프로바이더 간 처리가 비대칭이다 — 의도된 것인지 확인하고 손대라

같은 층위인데 한쪽에만 있는 처리가 셋 있다. 양쪽을 기계적으로 맞추려 하기 전에 각각이
왜 생겼는지 확인하라.

- **폴백**: Google만 `withModelFallback`을 거친다(index.ts:134-136). Anthropic은 단일 모델
  직접 호출이다(index.ts:68). Gemini free tier의 rate limit과 모델 폐지 때문에 생긴 안전망이라
  Anthropic 쪽에는 필요가 없었다.
- **잘림 감지**: Google만 `finishReason === 'MAX_TOKENS'`를 검사해 한국어 메시지를 던진다
  (index.ts:123-125). Anthropic 응답의 `stop_reason`은 검사하지 않으므로(index.ts:88-95),
  잘린 코드가 그대로 통과해 미리보기에서 문법 에러로 나타날 수 있다. 이건 알려진 빈틈이다.
- **토큰 예산**: Anthropic `max_tokens: 4096`(index.ts:78) vs Google `maxOutputTokens: 8192`
  (index.ts:107).

### 기본 프로바이더가 서버와 클라이언트에서 다르다

서버는 `provider` 필드가 없으면 `'anthropic'`으로 폴백한다(index.ts:161). 클라이언트 초기
상태는 `'google'`이다(src/App.tsx). 현재 클라이언트는 항상 `provider`를 명시해 보내므로
드러나지 않지만, 새로 API를 호출하는 코드가 이 필드를 빠뜨리면 UI 표시와 실제 호출 모델이
어긋난다. 요청을 만들 때 `provider`를 항상 명시하라.

### 이중 방어: 프롬프트와 후처리가 같은 위험을 두 번 막는다

생성된 코드는 두 가지 조건을 만족해야 react-live에서 렌더된다. 각각을 시스템 프롬프트와
후처리가 중복으로 보장한다. **한쪽만 보고 다른 쪽을 제거하지 마라.** 모델은 지시를 어긴다.

- 코드펜스 없음: 프롬프트로 지시(index.ts:16)하고, `stripCodeFences`로 다시 제거
  (generator.ts:5).
- `render(...)` 호출 존재: 프롬프트로 지시(index.ts:12)하고, 없으면 `ensureRenderCall`이
  첫 대문자 컴포넌트 선언을 찾아 주입(generator.ts:16-23).

### 시스템 프롬프트는 react-live의 실행 제약을 그대로 옮긴 것이다

`SYSTEM_PROMPT`(index.ts:7-49)의 규칙은 스타일 취향이 아니라 하드 제약이다. 위반하면
미리보기가 렌더되지 않는다.

- `import` 금지 — react-live 스코프에 모듈 시스템이 없다. React는 전역으로 주입된다.
- TypeScript 문법 금지 — 타입 주석·인터페이스·제네릭·`as` 캐스트가 있으면 파싱에 실패한다.
- 인라인 스타일만 — CSS import를 처리할 수단이 없다.
- 자체 완결형 — 외부 의존을 해석하지 못한다.

이 규칙을 완화하려면 `src/components/LivePreview.tsx`의 `LiveProvider` 설정(스코프 주입,
`noInline`)을 함께 바꿔야 한다. 프롬프트만 고치면 렌더가 깨진다.
