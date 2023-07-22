import { globToRegex } from "./fs.js";

/**
 * The fuel consumption of an action. If the fuel consumption is 0, the action
 * is free. If the player's fuel is less than the fuel consumption, the action
 * cannot be performed.
 */
export type FuelConsumption = number;

/**
 * A map of fuel consumption values.
 */
export class FuelConsumptionMap {
  /** The map of fuel consumption values. */
  #map: Map<string, FuelConsumption> = new Map();

  /**
   * Sets the fuel consumption for a type.
   * @param type The type to set the value for.
   * @param value The value to set.
   */
  set(type: string, value: FuelConsumption): FuelConsumptionMap {
    this.#map.set(type, value);
    return this;
  }

  /**
   * Gets the fuel consumption for a type.
   * @param glob The glob to match against.
   * @returns The fuel consumption values that match the glob.
   */
  get(glob: string): FuelConsumption[] {
    const types = [...this.#map.keys()];
    const matchedTypes = types.filter((type) => glob.match(globToRegex(type)));
    return matchedTypes.map((key) => this.#map.get(key)!);
  }

  /**
   * Deletes a type from the map.
   * @param type The type to delete.
   * @returns Whether the type was deleted.
   */
  del(type: string): boolean {
    return this.#map.delete(type);
  }
}

/**
 * The global fuel consumption map. This is used to determine how much fuel an
 * action consumes. If the fuel consumption is 0, the action is free. If the
 * player's fuel is less than the fuel consumption, the action cannot be
 * performed.
 */
export const fuelConsumptionMap = new FuelConsumptionMap();
