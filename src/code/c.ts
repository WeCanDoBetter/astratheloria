import { Engine } from "../engine.js";
import { Entity } from "../entity.js";
import { Removetrigger, TriggerListener, Triggers } from "../loop.js";

/**
 * The game engine as made available in Lua. This is a subset of the engine
 * interface, and is used to provide the game engine to Lua.
 */
export class GameEngine {
  #engine: Engine;

  constructor(engine: Engine) {
    this.#engine = engine;
  }

  get time(): number {
    return this.#engine.time;
  }

  get previousTime(): number {
    return this.#engine.previousTime;
  }
}

export class GameEntity {
  #entity: Entity;

  constructor(entity: Entity) {
    this.#entity = entity;
  }

  /**
   * If set, the entity will sleep until the given time. It will not be updated
   * until that time. This is useful for delaying the execution of a loop.
   */
  get sleepUntil(): number | undefined {
    return this.#entity.sleepUntil;
  }
}

/**
 * Create a function to add a trigger to an entity.
 * The trigger function is designed to be exposed on the global scope in Lua entity scripts.
 *
 * @param entity The entity to create the trigger on.
 * @returns The function to create the trigger.
 *
 * @example
 *
 * Lua example:
 *
 * ```lua
 * local remove = on("hit", function (damage)
 *    print("hit", Entity.name, Entity.attributes.health, damage)
 *    remove()
 * end)
 * ```
 */
export function createOn<
  Trigger extends Triggers,
  Args extends unknown[] = unknown[],
>(
  entity: Entity,
): OnTrigger<Trigger, Args> {
  return (trigger, listener) => entity.addTrigger<Args>(trigger, listener);
}

/**
 * The trigger function is designed to be exposed on the global scope in Lua entity scripts.
 *
 * @template T The type of trigger to listen for.
 * @template Args The type of arguments to the trigger.
 */
export type OnTrigger<T extends Triggers, Args extends unknown[] = unknown[]> =
  (trigger: T, listener: TriggerListener<Args>) => Removetrigger;

/**
 * A view is a wrapper around a buffer that contains a JSON encoded object.
 * The view is used to decode the buffer into a JavaScript object. The view
 * also contains the buffer, so that it can be updated.
 *
 * @template Body The type of the body of the view.
 * @emits error When the view fails to decode the buffer.
 *
 * ```ts
 * const view = View.decode<Body>(buffer);
 *
 * if (view.hasBody) {
 *  // Do something with the view body.
 * }
 *
 * // Update the buffer.
 * view.buffer = newBuffer;
 * ```
 */
export class View<
  Body extends Record<string, unknown> = Record<string, unknown>,
> extends EventTarget {
  /**
   * Decode a buffer into a view.
   * @param buffer The buffer to decode.
   * @returns The decoded view.
   */
  static decode<Body extends Record<string, unknown> = Record<string, unknown>>(
    buffer: Uint8Array,
  ): View<Body> {
    return new View(buffer);
  }

  /** The buffer of the view. */
  #buffer: Uint8Array;
  /** The body of the view. */
  #body: Body | null = null;

  private constructor(buffer: Uint8Array) {
    super();
    this.#buffer = buffer;
    this.decode();
  }

  /**
   * Get the buffer of the view.
   */
  get buffer(): Uint8Array {
    return this.#buffer;
  }

  /**
   * Set the buffer of the view.
   */
  set buffer(value: Uint8Array) {
    this.#buffer = value;
    this.decode();
  }

  /**
   * Whether the view has a valid body.
   */
  get hasBody(): boolean {
    return this.#body !== null;
  }

  /**
   * Get the body of the view.
   */
  get body(): Body | null {
    return this.#body;
  }

  /**
   * Decode the buffer into the body. If the buffer fails to decode, the body
   * will be set to null, and an error will be emitted.
   *
   * @throws {AggregateError} When the view fails to decode the buffer.
   * @emits error When the view fails to decode the buffer.
   */
  private decode(): void {
    try {
      this.#body = JSON.parse(new TextDecoder().decode(this.#buffer));
    } catch (error) {
      this.#body = null;

      const aggError = new AggregateError([error], "Failed to decode view.");
      this.dispatchEvent(new ErrorEvent("error", { error: aggError }));
      throw aggError;
    }
  }
}
