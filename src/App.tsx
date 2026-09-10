import { useState, useEffect, useRef } from 'react';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import { loadState, saveProvider } from './lib/storage';
import { loadApiKey, saveApiKey } from './lib/apiKeyStorage';
import type { Provider } from './types';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

function App() {
  const [provider, setProvider] = useState<Provider>(() => loadState()?.provider ?? 'google');
  const [apiKey, setApiKey] = useState(() => loadApiKey(loadState()?.provider ?? 'google'));
  const [showKey, setShowKey] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const [keyNotice, setKeyNotice] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { components, isLoading, error, generate, removeComponent, clearAll, restoredIds } =
    useComponentGenerator();

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!settingsRef.current?.contains(e.target as Node)) setSettingsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [settingsOpen]);

  const hasEnvKey = envKeys[provider];
  const isReady = hasEnvKey || apiKey.trim().length > 0;

  const handleGenerate = (prompt: string) => {
    if (!isReady) {
      setKeyNotice(
        `${PROVIDER_CONFIG[provider].label} API 키가 필요합니다. 설정에서 키를 입력하세요.`
      );
      setSettingsOpen(true);
      return;
    }
    setKeyNotice(null);
    generate(prompt, apiKey || undefined, provider);
  };

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    saveProvider(newProvider);
    // 프로바이더별로 키를 분리 보관하므로, 전환 시 해당 프로바이더의 키로 교체한다.
    // 다른 프로바이더의 키가 남아 잘못된 곳으로 전송되는 것을 막는다.
    setApiKey(loadApiKey(newProvider));
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    saveApiKey(provider, value);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="wordmark">컴포넌트 생성기</span>
          <div className="settings" ref={settingsRef}>
            <button
              type="button"
              className="settings-trigger"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((open) => !open)}
            >
              <span
                className={`status-dot ${isReady ? 'status-dot--ready' : ''}`}
                aria-hidden="true"
              />
              {PROVIDER_CONFIG[provider].label}
              <span className="visually-hidden">
                {isReady ? ' 키 연결됨' : ' 키 없음'}
              </span>
            </button>

            {settingsOpen && (
              <div className="settings-sheet">
                <div className="field">
                  <label htmlFor="provider">모델 제공자</label>
                  <select
                    id="provider"
                    value={provider}
                    onChange={(e) => handleProviderChange(e.target.value as Provider)}
                  >
                    {Object.entries(PROVIDER_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="api-key">API 키</label>
                  <div className="key-row">
                    <input
                      id="api-key"
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder={
                        hasEnvKey ? '서버 키 사용 중' : PROVIDER_CONFIG[provider].placeholder
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-plain"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? '숨기기' : '보기'}
                    </button>
                  </div>
                  <p className="field-note">
                    {hasEnvKey
                      ? '서버의 .env 키를 사용합니다. 여기에 입력하면 그 키를 대신 씁니다.'
                      : '키는 이 탭에만 저장되고 탭을 닫으면 지워집니다.'}
                  </p>
                  <p className="field-warning">
                    미리보기는 생성된 코드를 이 페이지에서 그대로 실행합니다. 그 코드는
                    저장된 키를 읽을 수 있으니, 신뢰할 수 없는 프롬프트를 쓸 때는 키를
                    직접 입력하지 말고 서버 .env를 사용하세요.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <section className="composer" aria-label="컴포넌트 만들기">
          <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />
        </section>

        {(error || keyNotice) && (
          <div className="alert" role="alert">
            {keyNotice ?? error}
          </div>
        )}

        <section className="results" aria-label="만든 컴포넌트">
          {components.length > 0 && (
            <div className="results-header">
              <h2>만든 컴포넌트 {components.length}개</h2>
              <button type="button" className="btn btn-plain" onClick={clearAll}>
                전체 지우기
              </button>
            </div>
          )}

          {isLoading && (
            <div className="progress" role="status">
              <span className="progress-dot" />
              만드는 중
            </div>
          )}

          {components.length === 0 && !isLoading && (
            <p className="empty">
              필요한 UI를 설명하면 여기에 렌더된 컴포넌트와 코드가 나타납니다.
            </p>
          )}

          <div className="results-list">
            {components.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                onRemove={removeComponent}
                onRegenerate={handleGenerate}
                isLoading={isLoading}
                restored={restoredIds.has(component.id)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
