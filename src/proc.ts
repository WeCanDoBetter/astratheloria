import Noise from "noisejs";
import { Vector3D } from "./code/movement";

/**
 * A hight field is a 2D array of numbers.
 */
export type HightField = Float32Array;

/**
 * Create a procedural noise generator.
 * @param seed The seed of the noise.
 * @returns The noise generator.
 */
export function createNoise(seed: number): Noise {
  return new Noise(seed);
}

/**
 * A 2D hight map.
 */
export class HightMap2D {
  /** The seed of the hight map. */
  readonly seed: number | null;
  /** The width of the hight map. */
  readonly width: number;
  /** The height of the hight map. */
  readonly height: number;
  /** The scale of the hight map. */
  readonly scale: number;
  /** The hight field of the hight map. */
  readonly field: HightField;

  constructor(
    seed: number | null,
    width: number,
    height: number,
    scale: number,
    field: HightField,
  ) {
    this.seed = seed;
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.field = field;
  }

  /**
   * The size of the hight map.
   */
  get size(): number {
    return this.width * this.height;
  }

  /**
   * Get the hight at the given position.
   * @param x The x position.
   * @param y The y position.
   * @returns The hight at the given position.
   */
  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new Error(`Out of bounds: ${x}, ${y}`);
    }

    return this.field[y * this.width + x];
  }

  /**
   * Set the hight at the given position.
   * @param x The x position.
   * @param y The y position.
   * @param hight The hight to set.
   */
  set(x: number, y: number, hight: number): void {
    this.field[y * this.width + x] = hight;
  }

  /**
   * Merge this hight map with the given hight map. The hight of the resulting
   * hight map is the average of the hight of the two hight maps.
   * @param other The other hight map.
   * @returns The merged hight map.
   */
  merge(other: HightMap2D): HightMap2D {
    const newField = new Float32Array(this.width * this.height);

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const myHeight = this.field[y * this.width + x];
        const otherHeight = other.get(x, y);
        const hight = myHeight > otherHeight ? myHeight / 2 : otherHeight / 2;

        newField[y * this.width + x] = hight;
      }
    }

    return new HightMap2D(
      null,
      this.width,
      this.height,
      this.scale,
      newField,
    );
  }

  /**
   * Copy this hight map.
   * @returns The copied hight map.
   */
  copy(): HightMap2D {
    return new HightMap2D(
      this.seed,
      this.width,
      this.height,
      this.scale,
      new Float32Array(this.field),
    );
  }

  *[Symbol.iterator](): IterableIterator<{
    x: number;
    y: number;
    hight: number;
  }> {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        yield { x, y, hight: this.field[y * this.width + x] };
      }
    }
  }
}

/**
 * A 3D hight map.
 */
export class Hightmap3D {
  /** The seed of the hight map. */
  readonly seed: number | null;
  /** The width of the hight map. */
  readonly width: number;
  /** The height of the hight map. */
  readonly height: number;
  /** The depth of the hight map. */
  readonly depth: number;
  /** The scale of the hight map. */
  readonly scale: number;
  /** The hight field of the hight map. */
  readonly field: Float32Array;

  constructor(
    seed: number | null,
    width: number,
    height: number,
    depth: number,
    scale: number,
    field: Float32Array,
  ) {
    this.seed = seed;
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.scale = scale;
    this.field = field;
  }

  /**
   * The size of the hight map.
   */
  get size(): number {
    return this.width * this.height * this.depth;
  }

  /**
   * Pin the given vector to the ground, with an optional offset.
   * @param vector The vector to pin to the ground.
   * @param offset The offset to add to the hight.
   * @returns The pinned vector.
   */
  pinTo(vector: Vector3D, offset = 0): Vector3D {
    const x = Math.floor(vector.x);
    const y = Math.floor(vector.y);
    const z = Math.floor(vector.z);

    const hight = this.get(x, y, z);

    return Vector3D.fromArray([x, y, hight + offset]);
  }

  /**
   * Get the hight at the given position.
   * @param x The x position.
   * @param y The y position.
   * @param z The z position.
   * @returns The hight at the given position.
   */
  get(x: number, y: number, z: number): number {
    if (
      x < 0 ||
      x >= this.width ||
      y < 0 ||
      y >= this.height ||
      z < 0 ||
      z >= this.depth
    ) {
      throw new Error(`Out of bounds: ${x}, ${y}, ${z}`);
    }

    return this.field[z * this.width * this.height + y * this.width + x];
  }

  /**
   * Set the hight at the given position.
   * @param x The x position.
   * @param y The y position.
   * @param z The z position.
   * @param hight The hight to set.
   */
  set(x: number, y: number, z: number, hight: number): void {
    this.field[z * this.width * this.height + y * this.width + x] = hight;
  }

  /**
   * Merge this hight map with the given hight map. The hight of the resulting
   * hight map is the average of the hight of the two hight maps.
   * @param other The other hight map.
   * @returns The merged hight map.
   */
  merge(other: Hightmap3D): Hightmap3D {
    const newField = new Float32Array(this.width * this.height * this.depth);

    for (let z = 0; z < this.depth; z += 1) {
      for (let y = 0; y < this.height; y += 1) {
        for (let x = 0; x < this.width; x += 1) {
          const myHeight = this.get(x, y, z);
          const otherHeight = other.get(x, y, z);
          const hight = (myHeight + otherHeight) / 2;

          newField[z * this.width * this.height + y * this.width + x] = hight;
        }
      }
    }

    return new Hightmap3D(
      null,
      this.width,
      this.height,
      this.depth,
      this.scale,
      newField,
    );
  }

  /**
   * Copy this hight map.
   * @returns The copied hight map.
   */
  copy(): Hightmap3D {
    return new Hightmap3D(
      this.seed,
      this.width,
      this.height,
      this.depth,
      this.scale,
      new Float32Array(this.field),
    );
  }

  *[Symbol.iterator](): IterableIterator<{
    x: number;
    y: number;
    z: number;
    hight: number;
  }> {
    for (let z = 0; z < this.depth; z += 1) {
      for (let y = 0; y < this.height; y += 1) {
        for (let x = 0; x < this.width; x += 1) {
          yield {
            x,
            y,
            z,
            hight:
              this.field[z * this.width * this.height + y * this.width + x],
          };
        }
      }
    }
  }
}
