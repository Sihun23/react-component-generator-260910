import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComponentGenerator } from './useComponentGenerator';
import { saveState, loadState } from '../lib/storage';

describe('useComponentGenerator 영속화', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('저장된 컴포넌트가 있으면 초기 상태로 복원한다', () => {
    saveState({
      provider: 'google',
      components: [
        { id: 'a', prompt: '저장된 프롬프트', code: 'render(<i />);', createdAt: new Date() },
      ],
    });

    const { result } = renderHook(() => useComponentGenerator());

    expect(result.current.components).toHaveLength(1);
    expect(result.current.components[0].prompt).toBe('저장된 프롬프트');
  });

  it('저장된 것이 없으면 빈 목록으로 시작한다', () => {
    const { result } = renderHook(() => useComponentGenerator());

    expect(result.current.components).toEqual([]);
  });

  it('clearAll은 저장된 컴포넌트도 함께 비운다', () => {
    saveState({
      provider: 'google',
      components: [{ id: 'a', prompt: 'p', code: 'c', createdAt: new Date() }],
    });

    const { result } = renderHook(() => useComponentGenerator());
    act(() => result.current.clearAll());

    expect(result.current.components).toEqual([]);
    expect(loadState()?.components ?? []).toEqual([]);
  });

  it('removeComponent 후 남은 목록이 저장된다', () => {
    saveState({
      provider: 'google',
      components: [
        { id: 'a', prompt: 'A', code: 'c', createdAt: new Date() },
        { id: 'b', prompt: 'B', code: 'c', createdAt: new Date() },
      ],
    });

    const { result } = renderHook(() => useComponentGenerator());
    act(() => result.current.removeComponent('a'));

    expect(loadState()?.components.map((c) => c.id)).toEqual(['b']);
  });
});
