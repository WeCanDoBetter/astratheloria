import {
  Movement,
  Orientation3D,
  Vector3D,
  Vector3DArray,
} from "./code/movement.js";
import {
  EntityAttributeItems,
  EntityEvent,
  ReadonlyEntityAttributeItems,
} from "./entity.js";
import type { DeepReadonly } from "./lobby.js";

/**
 * The game engine. The game engine is responsible for running the game.
 */
export interface Engine extends EventTarget {
  /** The current frame. */
  readonly time: number;
  /** The previous frame. */
  readonly previousTime: number;
  /** The delta between the current and previous frame. */
  readonly delta: number;
  /** The entities that are in the game. */
  readonly entities: ReadonlySet<Entity>;

  /** The fragments that are added to the engine. */
  readonly fragments: ReadonlySet<Fragment>;

  /**
   * Clears the fragments that are added to the engine.
   */
  clearFragments(): void;

  /**
   * Runs the engine game loop. The game loop is a function that is called every frame.
   * @param time The current frame.
   */
  update(time: number): Promise<void>;

  /**
   * Adds an entity to the engine.
   * @param entity The entity to add to the engine.
   */
  addEntity(entity: Entity): Engine;

  /**
   * Removes an entity from the engine.
   * @param entity The entity to remove from the engine.
   */
  removeEntity(entity: Entity): Engine;
}

/**
 * Removes a trigger from an entity.
 */
export type Removetrigger = () => void;

export interface EntityInit {
  readonly id?: string;
  readonly location: Vector3D;
  readonly orientation?: Orientation3D;
  readonly attributes: EntityAttributeItems;
}

/**
 * An entity is an object that is in the game. It can be a player, a projectile,
 * a building, etc.
 */
export interface Entity extends EventTarget {
  /** The ID of the entity. */
  readonly id: string;
  /** The loops that are run when the entity is updated. */
  readonly loops: ReadonlySet<Loop>;

  /** The triggers that are fired when the entity is updated. */
  readonly triggers: ReadonlyMap<Triggers, ReadonlySet<TriggerListener>>;

  /** The fragments that are added to the entity. */
  readonly fragments: ReadonlySet<Fragment>;

  /** The events that are fired when the entity is updated. */
  readonly events: ReadonlyMap<string, ReadonlySet<EntityEvent>>;

  /** The location of the entity. */
  location: Vector3DArray;

  /** The orientation of the entity. */
  orientation: Vector3DArray;

  /** The attributes of the entity. */
  readonly attributes: ReadonlyEntityAttributeItems;

  /** The movement of the entity. */
  readonly movement?: Movement;

  /**
   * If this is set, the entity will be asleep until the specified frame has
   * passed. The entity will not be updated during this time.
   */
  readonly sleepUntil?: number;

  /**
   * Updates the entity. This is called every frame.
   */
  update(): void;

  /**
   * Sets the location of the entity.
   * @param location The location to set.
   */
  setLocation(location: Vector3D): Entity;

  /**
   * Sets the orientation of the entity.
   * @param orientation The orientation to set.
   */
  setOrientation(orientation: Orientation3D): Entity;

  /**
   * Adds one or more fragments to the entity.
   * @param fragments The fragments to add to the entity.
   */
  addFragments(...fragments: Fragment[]): Entity;

  /**
   * Clears the fragments that are added to the entity.
   */
  clearFragments(): Entity;

  /**
   * Adds a trigger to the entity.
   * @template Args The arguments that are passed to the trigger.
   * @param trigger The trigger to add to the entity.
   * @param listener The listener that is called when the trigger is fired.
   * @returns A function that removes the trigger.
   */
  addTrigger<Args extends unknown[] = unknown[]>(
    trigger: Triggers,
    listener: TriggerListener<Args>,
  ): Removetrigger;

  /**
   * Adds an event to the entity.
   * @param name The name of the event.
   * @param args The arguments of the event.
   */
  addEvent<T extends Triggers, Args extends unknown[] = unknown[]>(
    name: T,
    ...args: Args
  ): Entity;

  /**
   * Clears the triggers that are added to the entity.
   */
  clearTriggers(): Entity;

  /**
   * Clears the events that are added to the entity.
   */
  clearEvents(): Entity;

  /**
   * Runs a trigger. This is used to fire a trigger manually.
   * @template Trigger The trigger to run.
   * @template Args The arguments that are passed to the trigger.
   * @param trigger The trigger to run.
   * @param args The arguments to pass to the trigger.
   */
  runTrigger<
    Trigger extends Triggers = Triggers,
    Args extends unknown[] = unknown[],
  >(trigger: Trigger, ...args: Args): Entity;
}

/**
 * The triggers that can be fired. These are used to run code when an event
 * occurs. For example, when an entity is hit, the "hit" trigger is fired.
 * @see Entity#addTrigger
 */
export type Triggers =
  | "hit"
  | "damage"
  | "attacked"
  | "built"
  | "created"
  | "destroyed";

/**
 * A trigger listener. This is called when a trigger is fired.
 * @template Args The arguments that are passed to the trigger.
 * @param args The arguments that are passed to the trigger.
 */
export type TriggerListener<Args extends unknown[] = unknown[]> = (
  ...args: Args
) => void;

/**
 * A loop. A loop is a function that is called every frame.
 * @param entity The entity that is being updated.
 * @param engine The engine that is running the game.
 * @returns The fragments that are added to the entity.
 */
export type Loop = (
  entity: Entity,
  engine: Engine,
) => void;

/**
 * A fragment. A fragment is a value that is added to an entity. Fragments are
 * used to update the game state.
 */
export interface Fragment<Value = unknown> {
  frame: number;
  key?: string;
  triggers?: Triggers[];
  value: Value;
}

/**
 * The loop function. The loop function is called every frame.
 * @param time The current frame.
 * @returns The result of the loop.
 */
export type LoopFunction = (time: number) => Promise<LoopResult>;

/**
 * The frame function. The frame function is called every frame.
 * @param fragments The fragments that have been collected.
 * @returns A promise that resolves when the frame has been processed.
 */
export type FrameFunction = (fragments: ReadonlySet<Fragment>) => Promise<void>;

/**
 * The result of a loop.
 */
export interface LoopResult {
  /** The frame that was run. */
  time: number;
  /** The fragments that were run. */
  fragments: ReadonlySet<Fragment>;
  /** The start time of the loop. */
  start: number;
  /** The end time of the loop. */
  end: number;
}

/**
 * Creates a game loop. The game loop is a function that is called every frame.
 * @param engine The engine that is running the game.
 * @param entities The entities that are in the game.
 * @param frame The frame to run every frame.
 * @returns The game loop.
 */
export function createLoop(
  engine: Engine,
  entities: ReadonlySet<DeepReadonly<Entity>>,
  frame: FrameFunction,
): LoopFunction {
  return async (time: number) => {
    let end: number | undefined;
    const start = performance.now();

    try {
      // Run the update for the engine
      await engine.update(time);
    } catch (error) {
      end = performance.now();

      throw new FrameError({
        engine,
        entities: new Set(entities) as Set<Entity>,
        specifier: "engine",
        code: "E_UPDATE",
        errors: [error as Error],
        start,
        end,
      });
    }

    // Run the update for all the entities
    for (const entity of entities) {
      try {
        entity.update();
      } catch (error) {
        end = performance.now();

        // NOTE: Should the loop continue if an entity throws an error?
        throw new FrameError({
          engine,
          entities: new Set(entities) as Set<Entity>,
          specifier: "entity",
          code: "E_UPDATE",
          errors: [error as Error],
          start,
          end,
        });
      }
    }

    // Get all the fragments from the engine and entities
    const fragments = new Set([
      ...engine.fragments,
      ...[...entities].flatMap((entity) => [...entity.fragments]),
    ]);

    // Clear the fragments for the engine
    engine.clearFragments();

    // Clear the fragments and events for all the entities
    entities.forEach((entity) =>
      entity.clearFragments() && entity.clearEvents()
    );

    try {
      // Run the frame for all the collected fragments
      await frame(fragments);
      end = performance.now();
    } catch (error) {
      end = performance.now();

      throw new FrameError({
        engine,
        entities: new Set(entities) as Set<Entity>,
        specifier: "frame",
        code: "E_FRAME",
        errors: [error as Error],
        start,
        end,
      });
    }

    return {
      time: engine.time,
      fragments,
      start,
      end,
    };
  };
}

/**
 * An error that occurred during a frame.
 */
export class FrameError extends AggregateError {
  /** The engine that is running the game. */
  readonly engine: Engine;
  /** The entities that are in the game. */
  readonly entities: ReadonlySet<Entity>;
  /** The specifier of the error. */
  readonly specifier: string;
  /** The code of the error. */
  readonly code: string;
  /** The errors that occurred. */
  readonly errors: Error[];

  /** The start time of the loop. */
  readonly start?: number;
  /** The end time of the loop. */
  readonly end?: number;

  constructor({ engine, entities, specifier, code, errors, start, end }: {
    engine: Engine;
    entities: ReadonlySet<Entity>;
    specifier: string;
    code: string;
    errors: Error[];
    start?: number;
    end?: number;
  }) {
    super(errors, `Error running ${specifier} at frame ${engine.time}`);

    this.engine = engine;
    this.entities = entities;
    this.specifier = specifier;
    this.code = code;
    this.errors = errors;
    this.start = start;
    this.end = end;
  }
}

/**
 * The options for a turn.
 */
export interface TurnOptions {
  /** The engine that is running the game. */
  engine: DeepReadonly<Engine>;
  /** The entities that are in the game. */
  entities: ReadonlySet<DeepReadonly<Entity>>;
  /**
   * The frame to run every frame. The frame function takes the fragments that
   * have been collected and processes them, thereby updating the game state.
   */
  frame: FrameFunction;
  /** The signal to abort the turn. */
  signal: AbortSignal;
}

/**
 * The result of a turn.
 */
export interface TurnResult {
  /** The frame that was run. */
  time: number;
  /** The fragments that were run. */
  fragments: ReadonlySet<Fragment>;
}

/**
 * Runs a turn. A turn collects all the fragments from the engine and entities,
 * runs the frame function, and returns the results.
 * @param options The options for the turn.
 * @param options.engine The engine that is running the game.
 * @param options.entities The entities that are in the game.
 * @param options.frame The frame to run every frame.
 * @param options.signal The signal to abort the turn.
 * @returns An async iterator that yields the results of the turn.
 */
export function turn({
  engine,
  entities,
  frame,
  signal,
}: TurnOptions): AsyncIterator<TurnResult> {
  const loop = createLoop(engine, entities, frame);

  return {
    async next() {
      if (signal.aborted) {
        return {
          done: true,
          value: undefined,
        };
      }

      // TODO: wait if the frame is too fast

      let result: LoopResult;

      try {
        result = await loop(engine.time);
      } catch (error) {
        throw new AggregateError(
          [error],
          `Error running turn at frame ${engine.time}`,
        );
      }

      const { fragments } = result;

      if (!fragments?.size) {
        return {
          done: false,
          value: {
            time: engine.time,
            fragments: fragments ?? new Set(),
          },
        };
      }

      return {
        done: false,
        value: {
          time: engine.time,
          fragments,
        },
      };
    },
  };
}
