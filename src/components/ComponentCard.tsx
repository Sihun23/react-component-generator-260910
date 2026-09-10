import { useState } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';

interface ComponentCardProps {
  component: GeneratedComponent;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  isLoading: boolean;
}

type Tab = 'preview' | 'code';

export function ComponentCard({
  component,
  onRemove,
  onRegenerate,
  isLoading,
}: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [previewKey, setPreviewKey] = useState(0);
  const panelId = `panel-${component.id}`;
  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article className="card">
      <div className="card-head">
        <div className="card-title">
          <p className="card-prompt">{component.prompt}</p>
          <span className="card-time">{createdAt}</span>
        </div>

        <div className="segmented" data-active={activeTab} role="tablist">
          <span className="segmented-thumb" aria-hidden="true" />
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preview'}
            aria-controls={panelId}
            className="segment"
            onClick={() => setActiveTab('preview')}
          >
            미리보기
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'code'}
            aria-controls={panelId}
            className="segment"
            onClick={() => setActiveTab('code')}
          >
            코드
          </button>
        </div>
      </div>

      <div className="card-body" id={panelId} role="tabpanel" tabIndex={-1}>
        {activeTab === 'preview' ? (
          <LivePreview key={previewKey} code={component.code} />
        ) : (
          <CodeView code={component.code} />
        )}
      </div>

      <div className="card-foot">
        {activeTab === 'preview' && (
          <button
            type="button"
            className="btn btn-plain"
            onClick={() => setPreviewKey((k) => k + 1)}
          >
            미리보기 새로고침
          </button>
        )}
        <button
          type="button"
          className="btn btn-plain"
          onClick={() => onRegenerate(component.prompt)}
          disabled={isLoading}
        >
          {isLoading ? '만드는 중' : '다시 만들기'}
        </button>
        <button
          type="button"
          className="btn btn-plain btn-danger"
          onClick={() => onRemove(component.id)}
        >
          삭제
        </button>
      </div>
    </article>
  );
}
