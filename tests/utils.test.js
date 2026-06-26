import { describe, it, expect, vi } from 'vitest';
import { debounce } from '../src/modules/utils.js';

describe('debounce', () => {
  it('should delay function execution', () => {
    vi.useFakeTimers();
    const func = vi.fn();
    const debouncedFunc = debounce(func, 100);

    debouncedFunc();
    expect(func).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
