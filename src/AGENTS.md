# src/AGENTS.md

## Module Context

Vite + React 19 프론트엔드. 프롬프트를 받아 `/api/generate`를 호출하고, 돌아온 코드를
react-live로 렌더링해 미리보기와 소스를 나란히 보여준다.

## Tech Stack & Constraints

- 스타일링은 **일반 CSS 파일**로 한다. `src/index.css`(리셋·폰트·전역 토큰)와
  `src/App.css`(컴포넌트 스타일) 두 개뿐이다. Tailwind, CSS-in-JS, CSS Modules를 도입하지 마라.
- 색·반경·이징은 `src/App.css` 상단의 CSS 변수로 정의되어 있다. 새 값을 하드코딩하기 전에
  기존 토큰으로 표현 가능한지 먼저 보라.
- 상태 관리 라이브러리가 없다. 생성 상태는 `hooks/useComponentGenerator.ts`의 로컬 상태이고,
  설정은 `App.tsx`의 `useState`다. Redux/Zustand 등을 추가하지 마라.
- 아이콘 라이브러리가 없다. 필요하면 인라인 SVG나 텍스트로 해결한다.

## Implementation Patterns

- API 호출은 `/api/...` 상대 경로로만 한다(hooks/useComponentGenerator.ts:23). Vite 프록시가
  3002로 넘긴다(vite.config.ts). `http://localhost:3002`를 직접 쓰면 빌드된 앱에서 깨진다.
- 컴포넌트는 `export function Name()` 네이밍드 익스포트를 쓴다(components/ 전체 동일).
  `App.tsx`만 default export다.
- Props 인터페이스는 컴포넌트 파일 안에 `interface XxxProps`로 정의한다. 공유 타입만
  `types/index.ts`에 둔다.

## Testing Strategy

```bash
bun run test        # 전체
bun run test:watch  # 감시 모드
```

vitest + jsdom + Testing Library. 셋업은 `src/test/setup.ts`.

테스트는 접근 가능한 이름으로 요소를 찾는다 — `getByRole('button', { name: '컴포넌트 만들기' })`
(components/PromptInput.test.tsx). **버튼·라벨 문구를 바꾸면 테스트가 깨진다.** 이건 결함이
아니라 의도된 결합이다. 문구를 바꿀 때 테스트를 함께 고쳐라.

## Local Golden Rules

### react-live 미리보기는 `noInline`이라 `render()`가 있어야 그려진다

`LivePreview`는 `<LiveProvider code={code} noInline>`로 실행한다
(components/LivePreview.tsx). `noInline` 모드에서는 마지막 표현식을 자동으로 렌더하지 않고
코드 안의 `render(...)` 호출을 기다린다. 호출이 없으면 **에러 없이 빈 화면**이 된다.

`render()` 주입은 서버의 `ensureRenderCall`이 담당한다. 미리보기가 비어 보이면 클라이언트가
아니라 서버가 돌려준 코드 문자열을 먼저 확인하라.

### 미리보기 리마운트는 `key` 교체로만 한다

애니메이션 컴포넌트를 다시 보려면 리마운트가 필요하다. `ComponentCard`는 `previewKey`를
증가시켜 `<LivePreview key={previewKey} ...>`에 넘기는 방식으로 처리한다. react-live에
리셋 API가 있는 것이 아니라 React의 key 규칙에 기대는 것이므로, 이 패턴을 유지하라.

### 생성된 컴포넌트는 신뢰할 수 없는 코드다

react-live는 AI가 만든 코드를 브라우저에서 그대로 실행한다. 미리보기 영역에 앱의 실제
상태나 키를 스코프로 주입하지 마라. 현재 `LiveProvider`에는 `scope`가 전달되지 않는다.
다만 `scope`를 비워도 생성 코드는 페이지와 같은 realm에서 돌기 때문에 전역에 접근할 수
있다. `scope`를 비우는 것은 실수 방지이지 격리가 아니다.

**복원된 카드는 코드 탭으로 연다**(`ComponentCard`의 `restored` prop). 저장된 코드가
페이지를 여는 것만으로 실행되면, 신뢰할 수 없는 코드가 사용자 조작 없이 매 방문마다
돌게 된다. 복원 여부는 `useComponentGenerator`의 `restoredIds`가 판단한다. 이 연결을
끊지 마라.

### API 키는 sessionStorage에만 둔다. localStorage로 옮기지 마라

키는 `lib/apiKeyStorage.ts`가 **sessionStorage**에 프로바이더별로 보관한다. 탭을 닫으면
사라지고 다른 탭과 공유되지 않는다.

**남아 있는 위험을 알고 써라.** react-live는 iframe 없이 페이지와 같은 realm에서 생성 코드를
평가한다. 따라서 생성된 컴포넌트가 `sessionStorage.getItem('rcg:keys:v1')`로 키를 읽어
외부로 보낼 수 있다. sessionStorage를 쓴다고 이 경로가 막히지 않는다 — 공격은 탭이 열려
있는 그 세션 안에서 일어나기 때문이다. `LiveProvider`에 `scope`를 넘기지 않는 것도 방어가
아니다.

이 위험을 감수하기로 한 결정이며(강의 데모 용도), 설정 패널에 경고 문구로 사용자에게
알린다. 근본 차단은 미리보기를 sandboxed iframe으로 격리해야 가능하다. **localStorage로
바꾸지 마라** — 탭을 닫아도 남게 되어 노출 창만 넓어지고 얻는 것이 없다.

키가 `lib/storage.ts`(localStorage)의 상태 블롭에 섞여 들어가지 않도록 `saveState`가 필드를
명시적으로 추리고 있고, 회귀 테스트로 고정되어 있다(lib/storage.test.ts의 "API 키는 저장하지
않는다"). 이 테스트를 지우지 마라.

프로바이더를 바꾸면 그 프로바이더의 키로 교체한다(`handleProviderChange`, App.tsx). 다른
프로바이더의 키가 남아 잘못된 곳으로 전송되는 것을 막는 처리이므로 제거하지 마라.

### 서버 키 유무는 `/api/config`로만 판단한다

앱 마운트 시 `/api/config`를 한 번 호출해 `envKeys`를 받는다(App.tsx의 `useEffect`).
이 응답은 boolean만 담고 있고 그래야 한다. 키 값 자체를 받아오도록 바꾸지 마라.

이 fetch가 실패하면 `.catch(() => {})`로 조용히 넘어가고 `envKeys`는 초기값(모두 false)으로
남는다. 서버가 죽어 있으면 UI가 "키 없음"으로 보인다는 뜻이다.
