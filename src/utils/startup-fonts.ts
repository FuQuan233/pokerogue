import { refreshLoadedFonts } from "#utils/font-refresh";

/** Give custom fonts a short head start without letting a stalled download block the game. */
export async function waitForStartupFonts(fonts: Pick<FontFaceSet, "load">, timeoutMs = 3000): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.all(["16px emerald", "10px pkmnems"].map(font => fonts.load(font).then(() => refreshLoadedFonts()))),
      new Promise<void>(resolve => {
        timeout = setTimeout(resolve, timeoutMs);
      }),
    ]);
  } catch (err) {
    console.error("Error loading fonts:", err);
  } finally {
    clearTimeout(timeout);
  }
}
