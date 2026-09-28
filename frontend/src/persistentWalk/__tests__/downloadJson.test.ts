// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { triggerJsonDownload } from '../downloadJson';

describe('JSON download helper', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('creates a JSON blob, clicks a named download link, and revokes the URL', async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:run-export');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    let clickedAnchor: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      clickedAnchor = this;
    });

    triggerJsonDownload({ model: 'kac-goldstein', seed: 15026 }, 'kac-goldstein-seed-15026.json');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
    expect(blob.size).toBeGreaterThan(0);
    expect(clickedAnchor?.href).toBe('blob:run-export');
    expect(clickedAnchor?.download).toBe('kac-goldstein-seed-15026.json');

    await vi.advanceTimersByTimeAsync(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:run-export');
  });
});
