import type Phaser from "phaser";
import backData from "../assets/baolilong/back.json";
import backUrl from "../assets/baolilong/back.png?no-inline";
import backShinyData from "../assets/baolilong/back-shiny.json";
import backShinyUrl from "../assets/baolilong/back-shiny.png?no-inline";
import frontData from "../assets/baolilong/front.json";
import frontUrl from "../assets/baolilong/front.png?no-inline";
import frontShinyData from "../assets/baolilong/front-shiny.json";
import frontShinyUrl from "../assets/baolilong/front-shiny.png?no-inline";
import iconData from "../assets/baolilong/icons.json";
import iconUrl from "../assets/baolilong/icons.png?no-inline";

// Explicit imports ship these custom assets with both Vite dev and production builds.
// They do not depend on uncommitted files in the upstream assets submodule.
const battleAtlases = {
  "1900": { url: frontUrl, data: frontData },
  "back/1900": { url: backUrl, data: backData },
  "shiny/1900": { url: frontShinyUrl, data: frontShinyData },
  "back/shiny/1900": { url: backShinyUrl, data: backShinyData },
};

export function getBaolilongAtlas(path: string) {
  return Object.hasOwn(battleAtlases, path) ? battleAtlases[path as keyof typeof battleAtlases] : undefined;
}

export function loadBaolilongIcons(loader: Phaser.Loader.LoaderPlugin): void {
  loader.atlas("baolilong_icons", iconUrl, iconData);
}

/** Append named frames without repacking or changing any upstream atlas coordinates. */
export function registerBaolilongIcons(textures: Phaser.Textures.TextureManager): void {
  for (const [atlasKey, frameNames] of [
    ["pokemon_icons_3", ["1900", "1900s"]],
    ["items", ["spheal_stone"]],
  ] as const) {
    const target = textures.get(atlasKey);
    const source = textures.get("baolilong_icons");
    for (const name of frameNames) {
      if (target.has(name)) {
        continue;
      }
      const frame = source.get(name);
      const sourceIndex = target.source.indexOf(frame.source);
      const index = sourceIndex < 0 ? target.source.push(frame.source) - 1 : sourceIndex;
      target.add(name, index, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight);
    }
  }
}
