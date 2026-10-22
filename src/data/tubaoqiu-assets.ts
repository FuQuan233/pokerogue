import type Phaser from "phaser";
import backData from "../assets/tubaoqiu/back.json";
import backUrl from "../assets/tubaoqiu/back.png?no-inline";
import backShinyData from "../assets/tubaoqiu/back-shiny.json";
import backShinyUrl from "../assets/tubaoqiu/back-shiny.png?no-inline";
import frontData from "../assets/tubaoqiu/front.json";
import frontUrl from "../assets/tubaoqiu/front.png?no-inline";
import frontShinyData from "../assets/tubaoqiu/front-shiny.json";
import frontShinyUrl from "../assets/tubaoqiu/front-shiny.png?no-inline";
import iconData from "../assets/tubaoqiu/icons.json";
import iconUrl from "../assets/tubaoqiu/icons.png?no-inline";

// Explicit imports ship these custom assets with both Vite dev and production builds.
// They do not depend on uncommitted files in the upstream assets submodule.
const battleAtlases = {
  "1901": { url: frontUrl, data: frontData },
  "back/1901": { url: backUrl, data: backData },
  "shiny/1901": { url: frontShinyUrl, data: frontShinyData },
  "back/shiny/1901": { url: backShinyUrl, data: backShinyData },
};

export function getTubaoqiuAtlas(path: string) {
  return Object.hasOwn(battleAtlases, path) ? battleAtlases[path as keyof typeof battleAtlases] : undefined;
}

export function loadTubaoqiuIcons(loader: Phaser.Loader.LoaderPlugin): void {
  loader.atlas("tubaoqiu_icons", iconUrl, iconData);
}

/** Append named frames without repacking or changing any upstream atlas coordinates. */
export function registerTubaoqiuIcons(textures: Phaser.Textures.TextureManager): void {
  for (const [atlasKey, frameNames] of [["pokemon_icons_3", ["1901", "1901s"]]] as const) {
    const target = textures.get(atlasKey);
    const source = textures.get("tubaoqiu_icons");
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
