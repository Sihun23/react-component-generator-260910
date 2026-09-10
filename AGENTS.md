# AGENTS.md

## Operational Commands

패키지 매니저는 `bun`으로 고정한다. npm/yarn/pnpm을 사용하지 않는다.

```bash
bun install          # 의존성 설치
bun run dev          # API 서버(3002) + Vite(5173) 동시 실행
bun run server       # API 서버만 (bun --watch)
bun run test         # vitest run — src/**와 server/** 모두 대상
bun run test:watch   # 감시 모드
bun run lint         # eslint
bun run build        # tsc -b && vite build
```

### Node 버전 제약

`vite@^8.0.1`(package.json)은 Node 20.19+ 또는 22.12+를 요구한다. Node 21.x에서는
Vite가 부팅 중 `node:util`의 `styleText` 호출로 `ERR_INVALID_ARG_VALUE`를 던지며 죽고,
`concurrently`는 API 서버만 남긴 채 계속 실행되므로 **에러가 조용히 묻힌다.**

`bun run dev` 후 5173이 응답하지 않으면 먼저 `node -v`를 확인한다. `bun run dev`의
출력에 `vite exited with code 1`이 있는지도 함께 본다.

## Golden Rules

### Immutable: API 키는 클라이언트로 넘어가지 않는다

- `/api/config`는 키의 **존재 여부(boolean)만** 반환한다(server/index.ts:147-157). 이 응답에
  키 값이나 마스킹된 일부를 절대 추가하지 마라. UI가 필요로 하는 것은 "키가 있는가"뿐이다.
- 환경변수 이름에 `VITE_` 접두사를 쓰지 마라. Vite는 `VITE_*`를 클라이언트 번들에 그대로
  인라인한다. 현재 코드에 `VITE_` 사용은 없다(검증됨). 키는 서버 프로세스의 `process.env`
  에서만 읽는다(server/index.ts:59-62).
- `.env.example`의 값은 항상 비워 둔다. `.env`는 gitignore되지만 `.env.example`은 git 추적
  대상이다(.gitignore:29). 실제로 이 파일에 Google API 키가 들어간 채 커밋 직전까지 간 적이
  있다.
- Google 키는 URL 쿼리스트링으로 전송된다(server/index.ts:99). 요청 URL을 로그로 남기지 마라.
- 서버는 클라이언트가 보낸 키를 그대로 외부 API에 전달하는 프록시다(server/index.ts:161-167).
  요청 body를 통째로 로깅하지 마라.

### Immutable: 포트 3002는 두 곳에 하드코딩되어 있다

`server/index.ts:139`의 `port: 3002`와 `vite.config.ts:11`의 프록시 `target`이 짝이다.
한쪽만 바꾸면 개발 환경에서 `/api/*`가 조용히 404가 된다. 바꿔야 한다면 두 곳을 함께 바꾼다.

### 테스트 경계: 순수 로직은 별도 모듈로 분리한다

테스트가 있는 파일과 없는 파일의 경계가 뚜렷하다.

- 테스트 있음: `server/generator.ts`, `server/fallback.ts`, `src/components/PromptInput.tsx`
- 테스트 없음: `server/index.ts`(Bun.serve + 네트워크), `src/hooks/useComponentGenerator.ts`, `src/App.tsx`

`server/generator.ts:1-2`에 그 이유가 주석으로 남아 있다 — "부수효과가 없어 단위 테스트가
가능하다". 새로운 정규화·변환 로직을 `server/index.ts`의 핸들러 안에 인라인으로 넣지 말고
순수 함수로 분리해 테스트와 함께 추가하라. 이 저장소는 그 방식으로 폴백 기능을 추가했다
(server/fallback.ts + server/fallback.test.ts).

## Project Context

프롬프트를 받아 AI가 자체 완결형 React 컴포넌트를 생성하고, react-live로 즉시 렌더링해
보여주는 워크벤치. 강의 데모 용도다.

기술 스택과 실행 방법은 README.md에 있다. 여기서 반복하지 않는다.

## Standards & References

- 커밋 메시지 규칙과 절차는 `.claude/skills/commit/SKILL.md`에 정의되어 있다. 커밋 작업 시
  그 스킬을 따른다.
- 기본 브랜치는 `main`. 작업은 브랜치를 만들어 진행하고 PR로 병합한다.
- 코드 주석은 한국어로 쓴다(server/generator.ts, server/fallback.ts 참고). 무엇을 하는지가
  아니라 왜 그렇게 했는지를 남긴다.
- 사용자 대면 에러 메시지는 한국어, 개발자 대면 예외는 영어로 되어 있다
  (server/index.ts:124 vs :112). 이 구분을 유지한다.

### Maintenance Policy

이 문서의 규칙과 실제 코드가 어긋난 것을 발견하면, 코드를 규칙에 맞추기 전에 먼저
어긋난 지점을 보고하고 문서 업데이트를 제안하라. 인용된 파일·라인 번호는 코드가 바뀌면
낡는다. 규칙을 근거로 판단하기 전에 해당 라인이 아직 유효한지 확인하라.

## Context Map

- **[API 서버 / AI 프로바이더 연동](./server/AGENTS.md)** — Bun 런타임, 프로바이더 추가·변경,
  응답 정규화 작업 시.
- **[프론트엔드 / 미리보기 UI](./src/AGENTS.md)** — React 컴포넌트, react-live 미리보기,
  스타일 작업 시.
