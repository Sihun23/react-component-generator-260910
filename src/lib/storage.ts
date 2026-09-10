// 새로고침 후에도 유지되어야 하는 상태를 localStorage에 보관한다.
// 부수효과가 localStorage 접근으로 한정되어 있어 단위 테스트가 가능하다.
import type { GeneratedComponent, Provider } from '../types';

const STORAGE_KEY = 'rcg:state:v1';

/** 용량 초과를 막기 위한 상한. 오래된 항목부터 버린다. */
export const MAX_COMPONENTS = 20;

export interface PersistedState {
  provider: Provider;
  components: GeneratedComponent[];
}

/** 직렬화 시 Date는 문자열이 되므로 복원 시 되돌려야 한다. */
type SerializedComponent = Omit<GeneratedComponent, 'createdAt'> & { createdAt: string };

function isSerializedComponent(value: unknown): value is SerializedComponent {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.prompt === 'string' &&
    typeof c.code === 'string' &&
    typeof c.createdAt === 'string'
  );
}

export function loadState(): PersistedState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // 프라이빗 모드 등에서 접근 자체가 막힐 수 있다.
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const { provider, components } = parsed as Record<string, unknown>;

  if (provider !== 'anthropic' && provider !== 'google') return null;

  // 항목 하나가 손상됐다고 provider까지 버리면 사용자가 고른 설정이 조용히 초기화된다.
  // 성한 항목만 살리고 나머지는 버린다.
  const list = Array.isArray(components) ? components : [];

  return {
    provider,
    components: list
      .filter(isSerializedComponent)
      .slice(0, MAX_COMPONENTS)
      .map((c) => ({ ...c, createdAt: new Date(c.createdAt) })),
  };
}

export function saveState(state: PersistedState): void {
  // 필드를 명시적으로 추린다. 호출부가 키 같은 값을 얹어 보내도 저장되지 않는다.
  const payload = {
    provider: state.provider,
    components: state.components.slice(0, MAX_COMPONENTS).map(({ id, prompt, code, createdAt }) => ({
      id,
      prompt,
      code,
      createdAt: createdAt.toISOString(),
    })),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // 용량 초과나 접근 거부 시 저장을 포기한다. 저장 실패가 앱을 멈추면 안 된다.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 위와 같다.
  }
}

const DEFAULT_PROVIDER: Provider = 'google';

/** 나머지 필드를 보존한 채 provider만 갱신한다. */
export function saveProvider(provider: Provider): void {
  saveState({ provider, components: loadState()?.components ?? [] });
}

/** 나머지 필드를 보존한 채 컴포넌트 목록만 갱신한다. */
export function saveComponents(components: GeneratedComponent[]): void {
  saveState({ provider: loadState()?.provider ?? DEFAULT_PROVIDER, components });
}
