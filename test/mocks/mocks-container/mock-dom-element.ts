import type { MockTextureManager } from "#test/mocks/mock-texture-manager";
import { MockContainer } from "#test/mocks/mocks-container/mock-container";

/** DOM input used by the private-server PvP code entry screen. */
export class MockDomElement extends MockContainer {
  constructor(
    manager: MockTextureManager,
    x: number,
    y: number,
    public node: HTMLElement,
  ) {
    super(manager, x, y);
  }

  addListener(_event: string): this {
    return this;
  }
}
