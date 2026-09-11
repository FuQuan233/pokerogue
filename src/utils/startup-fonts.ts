/** Give custom fonts a short head start without letting a stalled download block the game. */
export async function waitForStartupFonts(fonts: Pick<FontFaceSet, "load">, timeoutMs = 3000): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.all([fonts.load("16px emerald"), fonts.load("10px pkmnems")]),
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
