import {
  Movement,
  Orientation3D,
  Vector3D,
  type Vector3DArray,
} from "./code/movement.js";
import type {
  Engine,
  Entity as EntityInterface,
  EntityInit,
  Fragment,
  Loop,
  Removetrigger,
  TriggerListener,
  Triggers,
} from "./loop.js";

export type EntityAttributes =
  | "health"
  | "maxHealth"
  | "damage"
  | "armor"
  | "sleepUntil";

export interface EntityAttributeItem<
  Attribute extends EntityAttributes = EntityAttributes,
> {
  name: Attribute;
  value: number;
}

export class EntityAttributeItems {
  #attributes: Map<EntityAttributes, EntityAttributeItem> = new Map();

  set<Attribute extends EntityAttributes>(
    name: Attribute,
    value: number,
  ): EntityAttributeItems {
    this.#attributes.set(name, { name, value });
    return this;
  }

  get<Attribute extends EntityAttributes>(
    name: Attribute,
  ): EntityAttributeItem<Attribute> | undefined {
    return this.#attributes.get(name) as
      | EntityAttributeItem<Attribute>
      | undefined;
  }

  del(name: EntityAttributes): EntityAttributeItems {
    this.#attributes.delete(name);
    return this;
  }

  [Symbol.iterator](): IterableIterator<EntityAttributeItem> {
    return this.#attributes.values();
  }
}

export interface ReadonlyEntityAttributeItems {
  get<Attribute extends EntityAttributes>(
    name: Attribute,
  ): EntityAttributeItem<Attribute> | undefined;
}

/**
 * An entity event.
 */
export interface EntityEvent<Args extends unknown[] = unknown[]> {
  /** The name of the event. */
  name: string;
  /** The arguments of the event. */
  args: Args;
}

/**
 * An entity is an object which can be updated by the game engine.
 */
export class Entity extends EventTarget implements EntityInterface {
  readonly id: string;
  readonly engine: Engine;

  #loops: Set<Loop> = new Set();
  #triggers: Map<Triggers, Set<TriggerListener>> = new Map();
  #fragments: Set<Fragment> = new Set();
  #fragmentsByKey: Map<string, Fragment> = new Map();
  #events: Map<string, Set<EntityEvent>> = new Map();

  #location: Vector3D;
  #orientation: Orientation3D;
  #attributes = new EntityAttributeItems();
  #movement?: Movement;

  constructor(engine: Engine, init: EntityInit) {
    super();
    this.id = init.id ?? crypto.randomUUID();
    this.engine = engine;
    this.#location = init.location;
    this.#orientation = init.orientation ?? new Orientation3D([0, 0, 0]);

    for (const attribute of init.attributes) {
      this.#attributes.set(attribute.name, attribute.value);
    }
  }

  get loops(): ReadonlySet<Loop> {
    return this.#loops;
  }

  get triggers(): ReadonlyMap<Triggers, ReadonlySet<TriggerListener>> {
    return this.#triggers;
  }

  get fragments(): ReadonlySet<Fragment> {
    return this.#fragments;
  }

  get events(): ReadonlyMap<string, ReadonlySet<EntityEvent>> {
    return this.#events;
  }

  get location(): Vector3D {
    return this.#location.copy();
  }

  setLocation(location: Vector3D) {
    const fragment: Fragment<Vector3D> = {
      key: `Entity[${this.id}].location`,
      frame: this.engine.time,
      value: vector.copy(),
    };

    this.addFragments(fragment);
  }

  get orientation(): Orientation3D {
    return this.#orientation.copy();
  }

  setOrientation(orientation: Orientation3D) {
    const fragment: Fragment<Orientation3D> = {
      key: `Entity[${this.id}].orientation`,
      frame: this.engine.time,
      value: orientation.copy(),
    };

    this.addFragments(fragment);
  }

  get attributes(): ReadonlyEntityAttributeItems {
    return this.#attributes;
  }

  get sleepUntil(): number | undefined {
    return this.#attributes.get("sleepUntil")?.value;
  }

  set sleepUntil(value: number | undefined) {
    if (value === undefined || value === null) {
      this.#attributes.del("sleepUntil");
    } else {
      this.#attributes.set("sleepUntil", value);
    }
  }

  update(): Entity {
    if (this.#fragments.size) {
      throw new Error(`Entity ${this.id} must not have fragments.`);
    } else if (this.#events.size) {
      throw new Error(`Entity ${this.id} must not have events.`);
    }

    // Check sleep
    if (this.sleepUntil !== undefined) {
      if (this.engine.time < this.sleepUntil) {
        return this;
      }

      this.sleepUntil = undefined;
    }

    // Update the movement if it exists. If it returns true, then it is done
    // and we can remove it.
    if (this.#movement && this.#movement.update()) {
      this.#movement = undefined;
    }

    // Update the fragments.
    for (const loop of this.#loops) {
      loop(this, this.engine);
    }

    // Update the triggers.
    for (const [name, events] of this.#events) {
      for (const event of events) {
        this.runTrigger(name as Triggers, ...event.args);
      }
    }

    return this;
  }

  addFragments(...fragments: Fragment[]): Entity {
    for (const fragment of fragments) {
      if (fragment.key && this.#fragmentsByKey.has(fragment.key)) {
        this.#fragments.delete(fragment);
      }

      this.#fragments.add(fragment);

      if (fragment.key) {
        this.#fragmentsByKey.set(fragment.key, fragment);
      }
    }

    return this;
  }

  addEvent<Args extends unknown[] = unknown[]>(
    name: string,
    ...args: Args
  ): Entity {
    if (!this.#events.has(name)) {
      this.#events.set(name, new Set());
    }

    const events = this.#events.get(name) as Set<EntityEvent>;
    events.add({ name, args });
    return this;
  }

  clearFragments(): Entity {
    this.#fragments.clear();
    return this;
  }

  clearEvents(): Entity {
    this.#events.clear();
    return this;
  }

  addTrigger<Args extends unknown[] = unknown[]>(
    trigger: Triggers,
    listener: TriggerListener<Args>,
  ): Removetrigger {
    if (!this.#triggers.has(trigger)) {
      this.#triggers.set(trigger, new Set());
    }

    const triggers = this.#triggers.get(trigger) as Set<TriggerListener<Args>>;
    triggers.add(listener);
    return () => triggers.delete(listener);
  }

  clearTriggers(): Entity {
    this.#triggers.clear();
    return this;
  }

  runTrigger<T extends Triggers = Triggers, Args extends unknown[] = unknown[]>(
    trigger: T,
    ...args: Args
  ): Entity {
    const triggers = this.#triggers.get(trigger) as
      | Set<TriggerListener<Args>>
      | undefined;

    if (triggers) {
      for (const trigger of triggers) {
        trigger(...args);
      }
    }

    return this;
  }

  /**
   * Returns a string representation of the entity.
   */
  [Symbol.toStringTag] = `Entity(${this.id})`;

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return JSON.stringify(this, null, 2);
  }

  [Symbol.for("Deno.customInspect")](): string {
    return JSON.stringify(this, null, 2);
  }
}
