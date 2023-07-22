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

export interface Entity extends EventTarget {
  /** The triggers that are fired when the entity is updated. */
  triggers: ReadonlyMap<Triggers, ReadonlySet<Trigger>>;
  /** The fragments that are added to the entity. */
  fragments: ReadonlySet<Fragment>;
  /**
   * Clears the fragments that are added to the entity.
   */
  clearFragments(): void;
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

export type TriggerMap<Triggers extends string> = Map<Triggers, Trigger[]>;
export type LoopSet = Set<Loop>;

const triggerMap: TriggerMap<Triggers> = new Map();
const loopSet: LoopSet = new Set();

/**
 * Triggers are used to listen to events that happen to the entity. For example,
 * the `hit` trigger is fired when the entity is hit by a projectile.
 * @param trigger The trigger to listen to.
 * @param callback The callback to run when the trigger is fired.
 */
export function on<
  T extends Triggers = Triggers,
  Args extends unknown[] = unknown[],
>(trigger: T, callback: Trigger<Args>) {
  const map = triggerMap.get(trigger) as Trigger<Args>[] | undefined;

  if (map) {
    map.push(callback);
  } else {
    triggerMap.set(trigger, [callback as Trigger]);
  }
}

/**
 * Runs the trigger listeners for the entity. The trigger listeners are run when
 * the entity is updated.
 *
 * This function is called by the engine when a trigger is fired.
 *
 * @param trigger The trigger to run.
 * @param entity The entity that is being triggered.
 * @param engine The engine that is running the game.
 */
export function runTrigger<
  Trigger extends Triggers = Triggers,
  Args extends unknown[] = unknown[],
>(trigger: Trigger, entity: Entity, engine: Engine, ...args: Args) {
  const map = triggerMap.get(trigger);

  if (map) {
    for (const callback of map) {
      try {
        callback(entity, engine, ...args);
      } catch (_error) {
        // TODO: Handle error
      }
    }
  }
}

/**
 * Runs the game loop. The game loop is a function that is called every frame.
 * It is used to update the entity.
 *
 * This function is called by the engine every frame.
 *
 * @param currentFrame The current frame.
 * @param entity The entity that is being updated.
 * @param engine The engine that is running the game.
 */
export function runLoop(
  entity: Entity,
  engine: Engine,
): Fragment[] {
  const fragments: Fragment[] = [];

  for (const loop of loopSet) {
    try {
      fragments.push(...loop(entity, engine));
    } catch (_error) {}
  }

  return Array.from(fragments);
}

export interface Fragment {
  frame: number;
  key?: string;
  triggers?: Triggers[];
}

export type FragmentSet = Set<Fragment>;
export type EntitySet = Set<Entity>;
export type LoopFunction = () => Promise<LoopResult>;
export type FrameFunction = (fragments: FragmentSet) => Promise<void>;

export interface LoopResult {
  /** The frame that was run. */
  time: number;
  /** The fragments that were run. */
  fragments: ReadonlySet<Fragment>;
  start: number;
  end: number;
}

/**
 * Creates a game loop. The game loop is a function that is called every frame.
 * @param engine The engine that is running the game.
 * @param entities The entities that are in the game.
 * @param frame The frame to run every frame.
 * @returns The frames that were run.
 */
export function createLoop(
  engine: Engine,
  entities: EntitySet,
  frame: FrameFunction,
): LoopFunction {
  function updateEntity(entity: Entity) {
    // Run the loop first
    runLoop(entity, engine);

    // Run the triggers
    for (const [trigger] of entity.triggers) {
      runTrigger(trigger, entity, engine);
    }
  }

  return async () => {
    const start = performance.now();
    let end: number | undefined;

    try {
      // Update the engine first
      await engine.update();
    } catch (error) {
      // end = performance.now();
      throw new AggregateError([error], "Error running engine loop");
    }

    // Run the loop for every entity
    for (const entity of entities) {
      updateEntity(entity);
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
      // Run the frame for all the fragments
      await frame(fragments);
    } catch (error) {
      // end = performance.now();
      throw new AggregateError([error], `Frame error at frame ${engine.time}`);
    }

    end = performance.now();

    return {
      time: engine.time,
      fragments,
      start,
      end,
    };
  };
}

export interface TurnOptions {
  /** The engine that is running the game. */
  engine: Engine;
  /** The entities that are in the game. */
  entities: EntitySet;
  /** The frame to run every frame. */
  frame: FrameFunction;
  /** The signal to abort the turn. */
  signal?: AbortSignal;
}

export interface TurnResult {
  /** The frame that was run. */
  time: number;
  /** The fragments that were run. */
  fragments: ReadonlySet<Fragment>;
}

/**
 * @param options The options for the turn.
 * @param options.engine The engine that is running the game.
 * @param options.entities The entities that are in the game.
 * @param options.frame The frame to run every frame.
 * @param options.signal The signal to abort the turn.
 * @returns An async iterator that yields the frames that were run.
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
            fragments: new Set(),
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
