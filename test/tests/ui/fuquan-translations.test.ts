import { namespaceMap } from "#app/i18n-namespace-map";
import { registerFuquanTranslations } from "#data/fuquan-translations";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";
import chineseFallbacks from "../../../src/data/fuquan-zh-fallbacks.json";

function readResources(language: string): Record<string, object> {
  const root = join(process.cwd(), "locales", language);
  const resources: Record<string, object> = {};
  for (const file of readdirSync(root, { recursive: true, encoding: "utf8" }).filter(file => file.endsWith(".json"))) {
    const relative = file.replaceAll("\\", "/").replace(/\.json$/, "");
    const mapped = Object.entries(namespaceMap).find(([, filename]) => filename === relative)?.[0];
    const namespace = mapped ?? relative.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    const name = namespace.startsWith("mysteryEncounters/") ? namespace.replace(/Dialogue$/, "") : namespace;
    resources[name] = JSON.parse(readFileSync(join(root, file), "utf8"));
  }
  return resources;
}

function flatten(value: object, prefix = ""): [string, string][] {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof entry === "string" ? [[path, entry]] : entry && typeof entry === "object" ? flatten(entry, path) : [];
  });
}

async function createChineseInstance(language = "zh-Hans") {
  const instance = createInstance();
  await instance.init({
    lng: language,
    fallbackLng: "en",
    resources: { en: readResources("en"), [language]: readResources(language) },
    interpolation: { escapeValue: false },
  });
  registerFuquanTranslations(instance);
  return instance;
}

describe("FuQuan Chinese translations", () => {
  it("covers every English resource key in Simplified Chinese without falling back to English", async () => {
    const instance = await createChineseInstance();
    const missing: string[] = [];
    for (const [namespace, resources] of Object.entries(readResources("en"))) {
      for (const [key] of flatten(resources)) {
        const value = instance.getResource("zh-Hans", namespace, key);
        if (typeof value !== "string" || !value.trim()) {
          missing.push(`${namespace}:${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it.each(["zh-Hans", "zh-Hant"])("restores Chinese move effects in %s", async language => {
    const instance = await createChineseInstance(language);
    for (const key of Object.keys(chineseFallbacks.move)) {
      expect(instance.t(`move:${key}.effect`), key).toMatch(/[\u3400-\u9fff]/);
    }
    expect(instance.t("move:makeItRain.effect")).toContain("大幅降低");
    expect(instance.t("move:lunarDance.effect")).toContain("PP");
  });

  it("preserves interpolation variables in every restored translation", async () => {
    const instance = await createChineseInstance();
    const variables = (value: string) => [...value.matchAll(/\{\{([^}]+)\}\}/g)].map(match => match[1]).sort();
    for (const [namespace, resources] of Object.entries(chineseFallbacks)) {
      for (const [key, value] of flatten(resources)) {
        const english = instance.getResource("en", namespace, key);
        expect(typeof english, `${namespace}:${key}`).toBe("string");
        expect(variables(value), `${namespace}:${key}`).toEqual(variables(english));
      }
    }
    expect(instance.t("pokedexUiHandler:prevoRelearnMove", { level: 42 })).toContain("42");
    expect(instance.t("migrators:eggCompensation", { eggCount: 3 })).toContain("3");
  });

  it("keeps existing and future upstream Chinese translations, and repairs empty values", async () => {
    const instance = await createChineseInstance();
    instance.addResource("zh-Hans", "move", "peck.effect", "更新后的中文啄击说明");
    instance.addResource("zh-Hans", "move", "counter.effect", "");
    registerFuquanTranslations(instance);
    expect(instance.t("move:peck.effect")).toBe("更新后的中文啄击说明");
    expect(instance.t("move:counter.effect")).toMatch(/[\u3400-\u9fff]/);
    expect(instance.t("move:brightMoon.name")).toBe("明月");
  });
});
