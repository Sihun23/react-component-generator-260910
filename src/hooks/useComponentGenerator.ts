import { useState, useCallback, useEffect, useRef } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { loadState, saveComponents } from '../lib/storage';

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  isLoading: boolean;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
  /** 이전 세션에서 복원된 컴포넌트 id. 이 카드들은 코드를 자동 실행하지 않는다. */
  restoredIds: Set<string>;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useState<GeneratedComponent[]>(
    () => loadState()?.components ?? []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 마운트 시 읽어온 목록. 저장을 건너뛸지 판단하는 기준이다.
  //
  // ref 플래그로 "첫 렌더면 건너뛰기"를 하면 StrictMode에서 뚫린다. StrictMode는
  // 이펙트를 두 번 실행하는데 ref는 그 사이에 유지되므로, 두 번째 실행 때 플래그가
  // 이미 false라 마운트 저장이 그대로 일어난다. 값 자체를 비교하면 렌더 횟수와
  // 무관하게 정확하다.
  const loadedComponents = useRef(components);
  const restoredIds = useRef(new Set(components.map((c) => c.id)));

  useEffect(() => {
    if (components === loadedComponents.current) return;
    saveComponents(components);
  }, [components]);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate component');
      }

      const newComponent: GeneratedComponent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        code: data.code,
        createdAt: new Date(),
      };

      setComponents((prev) => [newComponent, ...prev]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, []);

  return {
    components,
    isLoading,
    error,
    generate,
    removeComponent,
    clearAll,
    restoredIds: restoredIds.current,
  };
}
