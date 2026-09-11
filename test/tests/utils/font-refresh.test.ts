import { onFontsLoaded, refreshLoadedFonts } from "#utils/font-refresh";
import { waitForStartupFonts } from "#utils/startup-fonts";
import { describe, expect, it, vi } from "vitest";

describe("Late font loading", () => {
  it("redraws existing text when one font arrives after startup, even if the other is still pending", async () => {
    vi.useFakeTimers();
    const redraw = vi.fn();
    const dispose = onFontsLoaded(redraw);
    try {
      const font = Promise.withResolvers<FontFace[]>();
      const load = vi
        .fn()
        .mockReturnValueOnce(font.promise)
        .mockReturnValueOnce(new Promise(() => {}));
      const startup = waitForStartupFonts({ load });
      await vi.advanceTimersByTimeAsync(3000);
      await startup;
      expect(redraw).not.toHaveBeenCalled();
      font.resolve([]);
      await vi.advanceTimersByTimeAsync(0);
      expect(redraw).toHaveBeenCalledOnce();
    } finally {
      dispose();
      vi.useRealTimers();
    }
  });

  it("does not retain or redraw destroyed text", () => {
    const redraw = vi.fn();
    const dispose = onFontsLoaded(redraw);
    dispose();
    refreshLoadedFonts();
    expect(redraw).not.toHaveBeenCalled();
  });
});
