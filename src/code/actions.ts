import type { Engine } from "../engine.js";
import type { Entity } from "../entity.js";
import { DeepReadonly } from "../lobby.js";

/**
 * A function that creates an action. The action is created for a specific entity.
 * @template Key The key of the action.
 * @param entity The entity to create the action for.
 * @returns The action.
 */
export type ActionCreator<
  Key extends string = string,
  Arguments extends ActionArguments = ActionArguments,
> = (
  engine: Engine,
  entity: Entity,
  ...args: Arguments
) => Action<Key, Arguments> | undefined;

/**
 * A record of action creators. The keys are the keys of the actions. The values are the action creators.
 * @template Actions The actions to create action creators for.
 */
export type ActionCreators<
  Actions extends Record<string, Action> = Record<string, Action>,
  Key extends keyof Actions = keyof Actions,
> = {
  [K in Key]: ActionCreator<K extends string ? K : never, Actions[K]["args"]>;
};

export const actions: ActionCreators<{
  move: Action<"move", ["destination"]>;
  sleep: Action<"sleep", ["end"]>;
}> = {
  move: (_engine, _entity, fff) => ({
    key: "move",
    fuel: 1,
    fuelDistanceMultiplier: 1,
    args: ["destination"],
  }),
  sleep: (_engine, _entity, ggg) => ({
    key: "sleep",
    fuel: 0,
    args: ["end"],
  }),
};

/**
 * The type of a value for a given type.
 * @template Type The type to get the value type for.
 */
export type TypeToValue<
  Type extends "string" | "number" | "boolean" | "unknown",
> = Type extends "string" ? string
  : Type extends "number" ? number
  : Type extends "boolean" ? boolean
  : Type extends "unknown" ? unknown
  : never;

/**
 * An argument required to perform an action.
 * @template Name The name of the argument.
 * @template Type The type of the argument.
 * @template Value The value of the argument.
 */
export type ActionArgument<
  Name extends string = string,
  Type extends "string" | "number" | "boolean" | "unknown" = "unknown",
  Value = TypeToValue<Type>,
> = Name | {
  type: Type;
  name: Name;
  value?: Value;
};

/**
 * The arguments required to perform an action.
 */
export type ActionArguments = ActionArgument[];

/**
 * An action that can be performed by an entity.
 * @template Key The key of the action.
 * @template Args The arguments required to perform the action.
 */
export interface Action<
  Key extends string = string,
  Args extends ActionArguments = ActionArguments,
> {
  /** The key of the action. */
  key: Key;
  /** The amount of fuel required to perform the action. */
  fuel: number;
  /** The distance multiplier to apply to the fuel cost. */
  fuelDistanceMultiplier?: number;
  /** The time multiplier to apply to the fuel cost. */
  fuelTimeMultiplier?: number;
  /** The arguments required to perform the action. */
  args: Args;
}

export class ActionHandler<
  Actions extends Record<string, Action> = Record<string, Action>,
> {
  /** The engine that the action handler is for. */
  readonly engine: Engine;

  /** The action creators. */
  readonly #creators: Partial<ActionCreators<Actions>>;

  constructor(engine: Engine, creators: ActionCreators<Actions>) {
    this.engine = engine;
    this.#creators = creators;
  }

  get creators(): DeepReadonly<ActionCreators<Actions>> {
    return this.#creators as DeepReadonly<ActionCreators<Actions>>;
  }

  /**
   * Adds action creators to the action handler.
   * @param creators The action creators to add.
   */
  add(creators: ActionCreators<Actions>): void {
    Object.assign(this.#creators, creators);
  }

  /**
   * Removes action creators from the action handler.
   * @param creators The action creators to remove.
   */
  del<Key extends keyof Actions>(key: Key): void {
    delete this.#creators[key];
  }

  /**
   * Checks if an entity can perform an action.
   * @param key The key of the action to perform.
   * @param entity The entity to perform the action.
   * @param remainingFuel The remaining fuel of the entity.
   * @param args The arguments to perform the action.
   * @returns The result of the check.
   */
  check<Key extends keyof Actions>(
    key: Key,
    entity: Entity,
    remainingFuel: number,
    ...args: Actions[Key]["args"]
  ): CheckResult {
    const action = this.#creators[key]?.(this.engine, entity, ...args);

    if (!action) {
      return CheckResult.NoAction;
    } else if (action.fuel > remainingFuel) {
      return CheckResult.NoFuel;
    } else if (args.length && !action.args.length) {
      return CheckResult.NoArgs;
    } else {
      // If the action has arguments, then check if the arguments are provided.
      if (args.length < action.args.length) {
        return CheckResult.NoArg;
      }
    }

    return CheckResult.Ok;
  }
}

/**
 * The result of an action check.
 */
export enum CheckResult {
  /** The action can be performed. */
  Ok = "OK",
  /** The action cannot be performed because the entity cannot perform the action. */
  NoAction = "NO_ACTION",
  /** The action cannot be performed because the entity does not have enough fuel. */
  NoFuel = "NO_FUEL",
  /** The action cannot be performed because the entity does not have enough arguments. */
  NoArgs = "NO_ARGS",
  /** The action cannot be performed because the entity does not have a specific argument. */
  NoArg = "NO_ARG",
}
