import type {
  Engine,
  Entity as EntityInterface,
  Fragment,
  Loop,
  Removetrigger,
  Trigger,
  Triggers,
} from "./loop.js";

export class Entity extends EventTarget implements EntityInterface {
  readonly engine: Engine;

  #loops: Set<Loop> = new Set();
  #triggers: Map<Triggers, Set<Trigger>> = new Map();
  #fragments: Set<Fragment> = new Set();
  #sleep?: number;

  constructor(engine: Engine) {
    super();
    this.engine = engine;
  }

  get loops(): ReadonlySet<Loop> {
    return this.#loops;
  }

  get fragments(): ReadonlySet<Fragment> {
    return this.#fragments;
  }

  get triggers(): ReadonlyMap<Triggers, ReadonlySet<Trigger>> {
    return this.#triggers;
  }

  get sleep(): number | undefined {
    return this.#sleep;
  }

  update(): Entity {
    // Check sleep
    if (this.#sleep !== undefined) {
      this.#sleep--;

      if (this.#sleep <= 0) {
        this.#sleep = undefined;
      }

      return this;
    }

    // Do the loops fist
    for (const loop of this.#loops) {
      this.addFragments(...loop(this, this.engine));
    }

    // TODO: Do the triggers

    return this;
  }

  addFragments(...fragments: Fragment[]): Entity {
    for (const fragment of fragments) {
      this.#fragments.add(fragment);
    }

    return this;
  }

  clearFragments(): Entity {
    this.#fragments.clear();
    return this;
  }

  addTrigger<Args extends unknown[] = unknown[]>(
    trigger: Triggers,
    callback: Trigger<Args>,
  ): Removetrigger {
    if (!this.#triggers.has(trigger)) {
      this.#triggers.set(trigger, new Set());
    }

    const triggers = this.#triggers.get(trigger) as Set<Trigger<Args>>;
    triggers.add(callback);
    return () => triggers.delete(callback);
  }

  clearTriggers(): Entity {
    this.#triggers.clear();
    return this;
  }

  runTrigger<
    T extends Triggers = Triggers,
    Args extends unknown[] = unknown[],
  >(
    trigger: T,
    ...args: Args
  ): Entity {
    const triggers = this.#triggers.get(trigger) as
      | Set<Trigger<Args>>
      | undefined;

    if (triggers) {
      for (const trigger of triggers) {
        trigger(this, this.engine, ...args);
      }
    }

    return this;
  }
}
