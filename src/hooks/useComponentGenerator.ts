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
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useState<GeneratedComponent[]>(
    () => loadState()?.components ?? []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  // 목록이 바뀔 때마다 저장한다. 마운트 직후는 방금 읽은 값을 되쓰는 것이라 건너뛴다.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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

  return { components, isLoading, error, generate, removeComponent, clearAll };
}
