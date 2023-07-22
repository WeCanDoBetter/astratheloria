import type { DeepReadonly } from "./lobby.js";

export interface Engine extends EventTarget {
  /** The fragments that are added to the engine. */
  readonly fragments: ReadonlySet<Fragment>;

  /**
   * Clears the fragments that are added to the engine.
   */
  clearFragments(): void;

  /** The current frame. */
  readonly time: number;

  /**
   * Runs the engine game loop. The game loop is a function that is called every frame.
   * @returns The frame number that was run.
   */
  update(): Promise<number>;

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

/**
 * An entity is an object that is in the game. It can be a player, a projectile,
 * a building, etc.
 */
export interface Entity extends EventTarget {
  /** The loops that are run when the entity is updated. */
  readonly loops: ReadonlySet<Loop>;

  /** The triggers that are fired when the entity is updated. */
  readonly triggers: ReadonlyMap<Triggers, ReadonlySet<Trigger>>;

  /** The fragments that are added to the entity. */
  readonly fragments: ReadonlySet<Fragment>;

  /**
   * If this is set, the entity will be asleep for the specified number of
   * frames. The entity will not be updated during this time.
   */
  readonly sleep?: number;

  /**
   * Updates the entity. This is called every frame.
   */
  update(): void;

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
    listener: Trigger<Args>,
  ): Removetrigger;

  /**
   * Clears the triggers that are added to the entity.
   */
  clearTriggers(): Entity;

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

export type Triggers =
  | "hit"
  | "damage"
  | "attacked"
  | "built"
  | "destroyed";

export type Trigger<Args extends unknown[] = unknown[]> = (
  entity: Entity,
  engine: Engine,
  ...rest: Args
) => void;
export type Loop = (
  entity: Entity,
  engine: Engine,
) => Fragment[];

export interface Fragment {
  frame: number;
  key?: string;
  triggers?: Triggers[];
}

/**
 * The loop function. The loop function is called every frame.
 * @returns The result of the loop.
 */
export type LoopFunction = () => Promise<LoopResult>;

/**
 * The frame function. The frame function is called every frame.
 * @param fragments The fragments that have been collected.
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
  entities: ReadonlySet<Entity>,
  frame: FrameFunction,
): LoopFunction {
  return async () => {
    let end: number | undefined;
    const start = performance.now();

    try {
      // Run the update for the engine
      await engine.update();
    } catch (error) {
      end = performance.now();

      throw new FrameError({
        engine,
        entities: new Set(entities),
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
          entities: new Set(entities),
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

    // Clear the fragments for the engine and entities
    engine.clearFragments();
    entities.forEach((entity) => entity.clearFragments());

    try {
      // Run the frame for all the collected fragments
      await frame(fragments);
      end = performance.now();
    } catch (error) {
      end = performance.now();

      throw new FrameError({
        engine,
        entities: new Set(entities),
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
  signal?: AbortSignal;
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
      if (signal?.aborted) {
        return {
          done: true,
          value: undefined,
        };
      }

      // TODO: wait if the frame is too fast

      let fragments: ReadonlySet<Fragment> | undefined;

      try {
        const result = await loop();
        fragments = result.fragments;
      } catch (error) {
        throw new AggregateError(
          [error],
          `Error running turn at frame ${engine.time}`,
        );
      }

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
