import { waitForStartupFonts } from "#utils/startup-fonts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Startup font loading", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows startup after three seconds even when a font download never finishes", async () => {
    const startGame = vi.fn();
    const load = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(new Promise(() => {}));
    const startup = waitForStartupFonts({ load }).then(startGame);
    await vi.advanceTimersByTimeAsync(2999);
    expect(startGame).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await startup;
    expect(startGame).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("starts immediately when both fonts are ready", async () => {
    await waitForStartupFonts({ load: vi.fn().mockResolvedValue([]) });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("allows startup when a font fails to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      waitForStartupFonts({ load: vi.fn().mockRejectedValue(new Error("offline")) }),
    ).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("handles a download failure after startup has already continued", async () => {
    let failDownload!: (reason: Error) => void;
    const download = new Promise<FontFace[]>((_, reject) => {
      failDownload = reject;
    });
    const startup = waitForStartupFonts({ load: vi.fn().mockReturnValue(download) });
    await vi.advanceTimersByTimeAsync(3000);
    await startup;
    failDownload(new Error("connection reset"));
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
