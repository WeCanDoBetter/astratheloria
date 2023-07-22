import {
  Entity as EntityInterface,
  Fragment,
  Trigger,
  Triggers,
} from "./loop.js";

export class Entity extends EventTarget implements EntityInterface {
  #fragments: Set<Fragment> = new Set();
  #triggers: Map<Triggers, Set<Trigger>> = new Map();

  get fragments(): ReadonlySet<Fragment> {
    return this.#fragments;
  }

  get triggers(): ReadonlyMap<Triggers, ReadonlySet<Trigger>> {
    return this.#triggers;
  }

  clearFragments(): void {
    this.#fragments.clear();
  }
}
