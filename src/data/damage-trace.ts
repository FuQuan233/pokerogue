/** Observation only: no RNG, re-applying effects, or retained Pokemon references. */
let activeLines: string[] | undefined;
let section = "";
export function traceLine(line: string): void {
  activeLines?.push(line);
}
export function isTracingDamage(): boolean {
  return activeLines !== undefined;
}
export function traceSection(label: string): void {
  section = label;
  traceLine(`【${label}】`);
}
export function captureDamageTrace<T>(run: () => T): { result: T; lines: string[] } {
  const previous = activeLines;
  const previousSection = section;
  const lines: string[] = [];
  activeLines = lines;
  section = "";
  try {
    return { result: run(), lines };
  } finally {
    activeLines = previous;
    section = previousSection;
  }
}
export function traceNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}
export function observeDamageChange<T>(label: string, args: readonly unknown[], run: () => T): T {
  if (!activeLines) {
    return run();
  }
  const holders = args.filter(
    (value): value is { value: number } =>
      typeof value === "object" && value !== null && "value" in value && typeof value.value === "number",
  );
  const before = holders.map(holder => holder.value);
  const arrays = args.filter(
    (value): value is number[] => Array.isArray(value) && value.length === 6 && value.every(n => typeof n === "number"),
  );
  const arrayBefore = arrays.map(value => [...value]);
  const result = run();
  holders.forEach((holder, index) => {
    if (holder.value !== before[index]) {
      traceLine(`${section}·${label}`);
      traceLine(`${traceNumber(before[index])} → ${traceNumber(holder.value)}`);
    }
  });
  arrays.forEach((values, index) => {
    if (values.some((value, stat) => value !== arrayBefore[index][stat])) {
      traceLine(`${section}·${label}（HP/攻/防/特攻/特防/速）`);
      traceLine(`${arrayBefore[index].join("/")} → ${values.join("/")}`);
    }
  });
  return result;
}
