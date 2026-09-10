import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadApiKey, saveApiKey, clearApiKey } from './apiKeyStorage';

describe('apiKeyStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('저장한 키를 복원한다', () => {
    saveApiKey('google', 'AIza-test');

    expect(loadApiKey('google')).toBe('AIza-test');
  });

  it('저장된 키가 없으면 빈 문자열을 반환한다', () => {
    expect(loadApiKey('anthropic')).toBe('');
  });

  it('프로바이더별로 키를 분리해 보관한다', () => {
    saveApiKey('google', 'AIza-google');
    saveApiKey('anthropic', 'sk-ant-key');

    expect(loadApiKey('google')).toBe('AIza-google');
    expect(loadApiKey('anthropic')).toBe('sk-ant-key');
  });

  it('빈 문자열을 저장하면 해당 키를 제거한다', () => {
    saveApiKey('google', 'AIza-test');

    saveApiKey('google', '');

    expect(loadApiKey('google')).toBe('');
  });

  it('clearApiKey는 해당 프로바이더의 키만 지운다', () => {
    saveApiKey('google', 'AIza-google');
    saveApiKey('anthropic', 'sk-ant-key');

    clearApiKey('google');

    expect(loadApiKey('google')).toBe('');
    expect(loadApiKey('anthropic')).toBe('sk-ant-key');
  });

  it('localStorage에는 키를 쓰지 않는다', () => {
    saveApiKey('google', 'AIza-secret');

    expect(JSON.stringify(localStorage)).not.toContain('AIza-secret');
    expect(localStorage.length).toBe(0);
  });

  it('손상된 데이터는 빈 문자열로 폴백한다', () => {
    sessionStorage.setItem('rcg:keys:v1', '{ JSON 아님');

    expect(() => loadApiKey('google')).not.toThrow();
    expect(loadApiKey('google')).toBe('');
  });

  it('sessionStorage 쓰기가 실패해도 예외를 던지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => saveApiKey('google', 'AIza-test')).not.toThrow();
  });

  it('sessionStorage 읽기가 실패해도 빈 문자열을 반환한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(loadApiKey('google')).toBe('');
  });
});
