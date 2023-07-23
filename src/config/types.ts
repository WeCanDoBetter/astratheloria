import { Hightmap3D } from "../proc.js";

export interface ArenaMapDescription extends Partial<BaseMetadata> {
  readonly id: string;
  readonly name: string;

  /** The width of the map. */
  readonly width: number;
  /** The height of the map. */
  readonly height: number;
  /** The depth of the map. */
  readonly depth: number;

  /**
   * The reference to the 3D hightmap.
   */
  readonly ref?: Hightmap3D;
}

/**
 * The description of an arena.
 */
export interface ArenaDescription extends Partial<BaseMetadata> {
  readonly id: string;

  /**
   * The map of the arena. The map is a 3D array of cells.
   */
  readonly map: ArenaMapDescription;
}

export interface BaseMetadata {
  /** The unique identifier of the item. */
  readonly id: string;
  /** The name of the item. */
  readonly name: string;
  /** The description of the item. */
  readonly description: string;
  /** The author of the item. */
  readonly author: string;
  /** The version of the item. */
  readonly repository: string;
  /** The version of the item. */
  readonly license: string;
  /** The tags of the item. */
  readonly tags: string[];
}
