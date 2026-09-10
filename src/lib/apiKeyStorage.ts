// API 키를 sessionStorage에 보관한다.
//
// localStorage가 아닌 sessionStorage를 쓰는 이유: 이 앱은 AI가 생성한 코드를
// react-live로 브라우저에서 그대로 실행하므로 XSS 표면이 넓다. sessionStorage는
// 탭을 닫으면 사라져 노출 창이 좁고, 다른 탭과도 공유되지 않는다.
// 새로고침 후 유지라는 목적은 동일하게 달성한다.
import type { Provider } from '../types';

const STORAGE_KEY = 'rcg:keys:v1';

type KeyMap = Partial<Record<Provider, string>>;

function readAll(): KeyMap {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return {};
  }
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as KeyMap;
  } catch {
    return {};
  }
}

function writeAll(keys: KeyMap): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // 저장 실패가 앱을 멈추면 안 된다. 키는 메모리 상태로 계속 동작한다.
  }
}

export function loadApiKey(provider: Provider): string {
  const value = readAll()[provider];
  return typeof value === 'string' ? value : '';
}

/** 빈 문자열을 넘기면 저장된 키를 제거한다. */
export function saveApiKey(provider: Provider, key: string): void {
  const keys = readAll();
  if (key) {
    keys[provider] = key;
  } else {
    delete keys[provider];
  }
  writeAll(keys);
}

export function clearApiKey(provider: Provider): void {
  saveApiKey(provider, '');
}
