const refreshers = new Set<() => void>();

/** Canvas text must be redrawn when a background font download finishes. */
export function refreshLoadedFonts(): void {
  for (const refresh of refreshers) {
    refresh();
  }
}

/** Returns cleanup so destroyed text is never retained or refreshed. */
export function onFontsLoaded(refresh: () => void): () => void {
  refreshers.add(refresh);
  return () => {
    refreshers.delete(refresh);
  };
}

document.fonts?.addEventListener("loadingdone", refreshLoadedFonts);
