import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loadState,
  saveState,
  clearState,
  saveProvider,
  saveComponents,
  MAX_COMPONENTS,
} from './storage';
import type { GeneratedComponent } from '../types';

function makeComponent(id: string, prompt = '버튼'): GeneratedComponent {
  return {
    id,
    prompt,
    code: 'render(<div />);',
    createdAt: new Date('2026-09-10T01:00:00.000Z'),
  };
}

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('저장한 상태를 그대로 복원한다', () => {
    saveState({ provider: 'google', components: [makeComponent('a')] });

    const loaded = loadState();

    expect(loaded?.provider).toBe('google');
    expect(loaded?.components).toHaveLength(1);
    expect(loaded?.components[0].prompt).toBe('버튼');
  });

  it('저장된 값이 없으면 null을 반환한다', () => {
    expect(loadState()).toBeNull();
  });

  it('createdAt을 Date 객체로 복원한다', () => {
    saveState({ provider: 'google', components: [makeComponent('a')] });

    const loaded = loadState();

    expect(loaded?.components[0].createdAt).toBeInstanceOf(Date);
    expect(loaded?.components[0].createdAt.toISOString()).toBe('2026-09-10T01:00:00.000Z');
  });

  it('손상된 JSON이면 예외 대신 null을 반환한다', () => {
    localStorage.setItem('rcg:state:v1', '{ 이건 JSON이 아니다');

    expect(() => loadState()).not.toThrow();
    expect(loadState()).toBeNull();
  });

  it('components 필드가 없어도 provider는 살리고 빈 목록으로 시작한다', () => {
    localStorage.setItem('rcg:state:v1', JSON.stringify({ provider: 'google' }));

    expect(loadState()).toEqual({ provider: 'google', components: [] });
  });

  it('provider가 유효하지 않으면 null을 반환한다', () => {
    localStorage.setItem(
      'rcg:state:v1',
      JSON.stringify({ provider: 'openai', components: [] })
    );

    expect(loadState()).toBeNull();
  });

  it(`컴포넌트를 최근 ${'MAX_COMPONENTS'}개까지만 저장한다`, () => {
    const many = Array.from({ length: MAX_COMPONENTS + 5 }, (_, i) => makeComponent(`id-${i}`));

    saveState({ provider: 'google', components: many });

    const loaded = loadState();
    expect(loaded?.components).toHaveLength(MAX_COMPONENTS);
    expect(loaded?.components[0].id).toBe('id-0');
  });

  it('API 키는 저장하지 않는다', () => {
    saveState({
      provider: 'google',
      components: [makeComponent('a')],
      // @ts-expect-error 호출부가 실수로 키를 넘겨도 저장되지 않아야 한다
      apiKey: 'AIza-secret-key',
    });

    expect(localStorage.getItem('rcg:state:v1')).not.toContain('AIza-secret-key');
  });

  it('localStorage 쓰기가 실패해도 예외를 던지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => saveState({ provider: 'google', components: [] })).not.toThrow();
  });

  it('localStorage 읽기가 실패해도 null을 반환한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(loadState()).toBeNull();
  });

  it('clearState는 저장된 상태를 제거한다', () => {
    saveState({ provider: 'google', components: [makeComponent('a')] });

    clearState();

    expect(loadState()).toBeNull();
  });

  describe('부분 저장', () => {
    it('saveProvider는 provider만 바꾸고 컴포넌트를 보존한다', () => {
      saveState({ provider: 'google', components: [makeComponent('a')] });

      saveProvider('anthropic');

      const loaded = loadState();
      expect(loaded?.provider).toBe('anthropic');
      expect(loaded?.components).toHaveLength(1);
    });

    it('saveComponents는 컴포넌트만 바꾸고 provider를 보존한다', () => {
      saveState({ provider: 'anthropic', components: [makeComponent('a')] });

      saveComponents([makeComponent('b'), makeComponent('c')]);

      const loaded = loadState();
      expect(loaded?.provider).toBe('anthropic');
      expect(loaded?.components.map((c) => c.id)).toEqual(['b', 'c']);
    });

    it('저장된 상태가 없을 때 saveProvider는 빈 목록으로 시작한다', () => {
      saveProvider('anthropic');

      expect(loadState()).toEqual({ provider: 'anthropic', components: [] });
    });

    it('저장된 상태가 없을 때 saveComponents는 google을 기본값으로 쓴다', () => {
      saveComponents([makeComponent('a')]);

      expect(loadState()?.provider).toBe('google');
    });
  });

  describe('리뷰 지적 반영', () => {
    it('일부 항목이 손상돼도 성한 항목과 provider를 살린다', () => {
      localStorage.setItem(
        'rcg:state:v1',
        JSON.stringify({
          provider: 'anthropic',
          components: [
            { id: 'a', prompt: 'A', code: 'c', createdAt: '2026-09-10T01:00:00.000Z' },
            { id: 'broken' },
            { id: 'b', prompt: 'B', code: 'c', createdAt: '2026-09-10T01:00:00.000Z' },
          ],
        })
      );

      const loaded = loadState();

      expect(loaded?.provider).toBe('anthropic');
      expect(loaded?.components.map((c) => c.id)).toEqual(['a', 'b']);
    });

    it('components가 배열이 아니어도 provider는 살린다', () => {
      localStorage.setItem(
        'rcg:state:v1',
        JSON.stringify({ provider: 'anthropic', components: 'not-an-array' })
      );

      expect(loadState()).toEqual({ provider: 'anthropic', components: [] });
    });

    it('상한을 넘겨 저장된 데이터를 읽을 때도 상한을 적용한다', () => {
      const many = Array.from({ length: MAX_COMPONENTS + 5 }, (_, i) => ({
        id: `id-${i}`,
        prompt: 'p',
        code: 'c',
        createdAt: '2026-09-10T01:00:00.000Z',
      }));
      localStorage.setItem(
        'rcg:state:v1',
        JSON.stringify({ provider: 'google', components: many })
      );

      expect(loadState()?.components).toHaveLength(MAX_COMPONENTS);
    });
  });
});
