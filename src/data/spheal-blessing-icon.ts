import type Phaser from "phaser";

/** Reuse Spheal's sprite in the item atlas so every item UI uses the same icon. */
export function registerSphealBlessingIcon(textures: Phaser.Textures.TextureManager): void {
  const items = textures.get("items");
  if (items.has("spheal_blessing")) {
    return;
  }

  const spheal = textures.getFrame("pokemon_icons_3", "363");
  const sourceIndex = items.source.length;
  items.source.push(spheal.source);
  const frame = items.add("spheal_blessing", sourceIndex, spheal.cutX, spheal.cutY, spheal.cutWidth, spheal.cutHeight);
  // Center the trimmed sprite in the standard 32px item slot.
  frame?.setTrim(
    32,
    32,
    Math.floor((32 - spheal.cutWidth) / 2),
    Math.floor((32 - spheal.cutHeight) / 2),
    spheal.cutWidth,
    spheal.cutHeight,
  );
}
