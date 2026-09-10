import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentCard } from './ComponentCard';
import type { GeneratedComponent } from '../types';

const component: GeneratedComponent = {
  id: 'a',
  prompt: '버튼',
  code: 'render(<div>hi</div>);',
  createdAt: new Date('2026-09-10T01:00:00.000Z'),
};

const noop = () => {};

describe('ComponentCard 기본 탭', () => {
  it('새로 만든 카드는 미리보기 탭으로 열린다', () => {
    render(
      <ComponentCard component={component} onRemove={noop} onRegenerate={noop} isLoading={false} />
    );

    expect(screen.getByRole('tab', { name: '미리보기' })).toHaveAttribute('aria-selected', 'true');
  });

  it('복원된 카드는 코드 탭으로 열려 저장된 코드가 자동 실행되지 않는다', () => {
    render(
      <ComponentCard
        component={component}
        onRemove={noop}
        onRegenerate={noop}
        isLoading={false}
        restored
      />
    );

    expect(screen.getByRole('tab', { name: '코드' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '미리보기' })).toHaveAttribute('aria-selected', 'false');
  });
});
