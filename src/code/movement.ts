import { Engine } from "../engine.js";
import { Entity } from "../entity.js";
import type { DeepReadonly } from "../lobby.js";

/**
 * The options that are used to create a movement.
 */
export interface MovementOptions {
  /**
   * The unique identifier for the movement.
   * If not provided, a random UUID will be generated.
   */
  id?: string;
  /** The entity that the movement is running on. */
  entity: Entity;
  /** The engine that the movement is running on. */
  engine: Engine;
  /** The steps that the movement will take. */
  steps: MovementStep[];
}

/**
 * A 3D vector array. This is used to represent a position or a velocity.
 */
export type Vector3DArray = [x: number, y: number, z: number];

/**
 * A 3D vector. This is used to represent a position or a velocity.
 */
export class Vector3D {
  /**
   * Build a vector from an array.
   * @param array The array to create the vector from.
   * @returns A new vector.
   */
  static fromArray(array: Vector3DArray): Vector3D {
    return new Vector3D(array);
  }

  /**
   * Build a vector from an object.
   * @param object The object to create the vector from.
   * @returns A new vector.
   */
  static fromObject(object: { x: number; y: number; z: number }): Vector3D {
    return new Vector3D([object.x, object.y, object.z]);
  }

  /**
   * Build a vector from a string.
   * @param string The string to create the vector from.
   * @returns A new vector.
   */
  static fromVector(vector: Vector3D): Vector3D {
    return new Vector3D([vector.x, vector.y, vector.z]);
  }

  /**
   * Build a vector from a string.
   * @param string The string to create the vector from.
   * @returns A new vector.
   */
  static fromString(string: string): Vector3D {
    const [x, y, z] = string.split(",").map((value) => parseFloat(value));
    return new Vector3D([x, y, z]);
  }

  /**
   * Interpolate between two vectors.
   * @param from The vector to interpolate from.
   * @param to The vector to interpolate to.
   * @param t The interpolation factor.
   * @returns A new vector.
   */
  static interpolate(
    from: Vector3D | Vector3DArray,
    to: Vector3D | Vector3DArray,
    t: number,
  ): Vector3D {
    const fromVector = from instanceof Vector3D
      ? from
      : Vector3D.fromArray(from);
    const toVector = to instanceof Vector3D ? to : Vector3D.fromArray(to);
    return fromVector.interpolate(toVector, t);
  }

  /**
   * Subtract one vector from another.
   * @param from The vector to subtract from.
   * @param to The vector to subtract.
   * @returns A new vector.
   */
  static subtract(
    from: Vector3D | Vector3DArray,
    to: Vector3D | Vector3DArray,
  ): Vector3D {
    const fromVector = from instanceof Vector3D
      ? from
      : Vector3D.fromArray(from);
    const toVector = to instanceof Vector3D ? to : Vector3D.fromArray(to);
    return fromVector.subtract(toVector);
  }

  /**
   * Add one vector to another.
   * @param from The vector to add to.
   * @param to The vector to add.
   * @returns A new vector.
   */
  static add(
    from: Vector3D | Vector3DArray,
    to: Vector3D | Vector3DArray,
  ): Vector3D {
    const fromVector = from instanceof Vector3D
      ? from
      : Vector3D.fromArray(from);
    const toVector = to instanceof Vector3D ? to : Vector3D.fromArray(to);
    return fromVector.add(toVector);
  }

  /**
   * Scale a vector.
   * @param vector The vector to scale.
   * @param scalar The scalar to scale the vector by.
   * @returns A new vector.
   */
  static scale(vector: Vector3D | Vector3DArray, scalar: number): Vector3D {
    const fromVector = vector instanceof Vector3D
      ? vector
      : Vector3D.fromArray(vector);
    return fromVector.scale(scalar);
  }

  #vector: Vector3DArray;

  constructor(vector: Vector3DArray) {
    this.#vector = vector;
  }

  /**
   * The x component of the vector.
   */
  get x(): number {
    return this.#vector[0];
  }

  set x(value: number) {
    this.#vector[0] = value;
  }

  /**
   * The y component of the vector.
   */
  get y(): number {
    return this.#vector[1];
  }

  set y(value: number) {
    this.#vector[1] = value;
  }

  /**
   * The z component of the vector.
   */
  get z(): number {
    return this.#vector[2];
  }

  set z(value: number) {
    this.#vector[2] = value;
  }

  /**
   * Interpolate between two vectors.
   * @param other The vector to interpolate to.
   * @param t The interpolation factor.
   * @returns A new vector.
   */
  interpolate(other: Vector3D, t: number): Vector3D {
    return new Vector3D([
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t,
      this.z + (other.z - this.z) * t,
    ]);
  }

  /**
   * Subtract one vector from another.
   * @param other The vector to subtract.
   * @returns A new vector.
   */
  subtract(other: Vector3D): Vector3D {
    return new Vector3D([
      this.x - other.x,
      this.y - other.y,
      this.z - other.z,
    ]);
  }

  /**
   * Add one vector to another.
   * @param other The vector to add.
   * @returns A new vector.
   */
  add(other: Vector3D): Vector3D {
    return new Vector3D([
      this.x + other.x,
      this.y + other.y,
      this.z + other.z,
    ]);
  }

  /**
   * Scale a vector.
   * @param scalar The scalar to scale the vector by.
   * @returns A new vector.
   */
  scale(scalar: number): Vector3D {
    return new Vector3D([
      this.x * scalar,
      this.y * scalar,
      this.z * scalar,
    ]);
  }

  /**
   * Copy the vector.
   * @returns A new vector.
   */
  copy(): Vector3D {
    return new Vector3D(this.#vector);
  }

  /**
   * Convert the vector to a 3D orientation.
   * @returns A new 3D orientation.
   */
  toOrientation(): Orientation3D {
    return new Orientation3D(this.#vector);
  }

  /**
   * The vector as a string.
   */
  toString(): Vector3DString {
    return `${this.x},${this.y},${this.z}`;
  }

  /**
   * The vector as an object.
   */
  toObject(): Vector3DObject {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
    };
  }

  /**
   * The vector as an array.
   */
  toArray(): Vector3DArray {
    return [...this.#vector];
  }
}

export type Vector3DString = `${string},${string},${string}`;
export type Vector2DString = `${string},${string}`;

/**
 * A 3D vector object. This is used to represent a position or a velocity.
 */
export interface Vector3DObject {
  x: number;
  y: number;
  z: number;
}

export interface Vector2DObject {
  x: number;
  y: number;
}

/**
 * A 3D orientation array. This is used to represent a rotation.
 */
export class Orientation3D {
  /**
   * Build an orientation from an array.
   * @param array The array to create the orientation from.
   * @returns A new orientation.
   */
  static fromArray(array: Vector3DArray): Orientation3D {
    return new Orientation3D(array);
  }

  /**
   * Build an orientation from an object.
   * @param object The object to create the orientation from.
   * @returns A new orientation.
   */
  static fromObject(
    object: { pitch: number; yaw: number; roll: number },
  ): Orientation3D {
    return new Orientation3D([object.pitch, object.yaw, object.roll]);
  }

  /**
   * Build an orientation from a vector.
   * @param vector The vector to create the orientation from.
   * @returns A new orientation.
   */
  static fromOrientation(orientation: Orientation3D): Orientation3D {
    return new Orientation3D([
      orientation.pitch,
      orientation.yaw,
      orientation.roll,
    ]);
  }

  /**
   * Build an orientation from a string.
   * @param string The string to create the orientation from.
   * @returns A new orientation.
   */
  static fromString(string: string): Orientation3D {
    const [pitch, yaw, roll] = string
      .split(",")
      .map((value) => parseFloat(value));

    return new Orientation3D([pitch, yaw, roll]);
  }

  /**
   * Interpolate between two orientations.
   * @param from The orientation to interpolate from.
   * @param to The orientation to interpolate to.
   * @param t The interpolation factor.
   * @returns A new orientation.
   */
  static interpolate(
    from: Orientation3D | Vector3DArray,
    to: Orientation3D | Vector3DArray,
    t: number,
  ): Orientation3D {
    const fromOrientation = from instanceof Orientation3D
      ? from
      : Orientation3D.fromArray(from);
    const toOrientation = to instanceof Orientation3D
      ? to
      : Orientation3D.fromArray(to);
    return fromOrientation.interpolate(toOrientation, t);
  }

  /**
   * Subtract one orientation from another.
   * @param from The orientation to subtract from.
   * @param to The orientation to subtract.
   * @returns A new orientation.
   */
  static subtract(
    from: Orientation3D | Vector3DArray,
    to: Orientation3D | Vector3DArray,
  ): Orientation3D {
    const fromOrientation = from instanceof Orientation3D
      ? from
      : Orientation3D.fromArray(from);
    const toOrientation = to instanceof Orientation3D
      ? to
      : Orientation3D.fromArray(to);
    return fromOrientation.subtract(toOrientation);
  }

  /**
   * Add one orientation to another.
   * @param from The orientation to add to.
   * @param to The orientation to add.
   * @returns A new orientation.
   */
  static add(
    from: Orientation3D | Vector3DArray,
    to: Orientation3D | Vector3DArray,
  ): Orientation3D {
    const fromOrientation = from instanceof Orientation3D
      ? from
      : Orientation3D.fromArray(from);
    const toOrientation = to instanceof Orientation3D
      ? to
      : Orientation3D.fromArray(to);
    return fromOrientation.add(toOrientation);
  }

  /**
   * Scale an orientation.
   * @param orientation The orientation to scale.
   * @param scalar The scalar to scale the orientation by.
   * @returns A new orientation.
   */
  static scale(
    orientation: Orientation3D | Vector3DArray,
    scalar: number,
  ): Orientation3D {
    const fromOrientation = orientation instanceof Orientation3D
      ? orientation
      : Orientation3D.fromArray(orientation);
    return fromOrientation.scale(scalar);
  }

  /**
   * Calculate the dot product of two orientations.
   * @param from The orientation to calculate the dot product from.
   * @param to The orientation to calculate the dot product to.
   * @returns The dot product.
   */
  static dot(
    from: Orientation3D | Vector3DArray,
    to: Orientation3D | Vector3DArray,
  ): number {
    const fromOrientation = from instanceof Orientation3D
      ? from
      : Orientation3D.fromArray(from);
    const toOrientation = to instanceof Orientation3D
      ? to
      : Orientation3D.fromArray(to);

    return (
      fromOrientation.pitch * toOrientation.pitch +
      fromOrientation.yaw * toOrientation.yaw +
      fromOrientation.roll * toOrientation.roll
    );
  }

  /** The orientation. */
  #orientation: Vector3DArray;

  constructor(orientation: Vector3DArray) {
    this.#orientation = orientation;
  }

  /**
   * The pitch of the orientation. This is the rotation around the x axis.
   */
  get pitch(): number {
    return this.#orientation[0];
  }

  set pitch(value: number) {
    this.#orientation[0] = value;
  }

  /**
   * The yaw of the orientation. This is the rotation around the y axis.
   */
  get yaw(): number {
    return this.#orientation[1];
  }

  set yaw(value: number) {
    this.#orientation[1] = value;
  }

  /**
   * The roll of the orientation. This is the rotation around the z axis.
   */
  get roll(): number {
    return this.#orientation[2];
  }

  set roll(value: number) {
    this.#orientation[2] = value;
  }

  /**
   * Interpolate between two orientations.
   * @param other The orientation to interpolate to.
   * @param t The interpolation factor.
   * @returns A new orientation.
   */
  interpolate(other: Orientation3D, t: number): Orientation3D {
    return new Orientation3D([
      this.pitch + (other.pitch - this.pitch) * t,
      this.yaw + (other.yaw - this.yaw) * t,
      this.roll + (other.roll - this.roll) * t,
    ]);
  }

  /**
   * Subtract one orientation from another.
   * @param other The orientation to subtract.
   * @returns A new orientation.
   */
  subtract(other: Orientation3D): Orientation3D {
    return new Orientation3D([
      this.pitch - other.pitch,
      this.yaw - other.yaw,
      this.roll - other.roll,
    ]);
  }

  /**
   * Add one orientation to another.
   * @param other The orientation to add.
   * @returns A new orientation.
   */
  add(other: Orientation3D): Orientation3D {
    return new Orientation3D([
      this.pitch + other.pitch,
      this.yaw + other.yaw,
      this.roll + other.roll,
    ]);
  }

  /**
   * Scale an orientation.
   * @param scalar The scalar to scale the orientation by.
   * @returns A new orientation.
   */
  scale(scalar: number): Orientation3D {
    return new Orientation3D([
      this.pitch * scalar,
      this.yaw * scalar,
      this.roll * scalar,
    ]);
  }

  /**
   * Calculate the dot product of two orientations.
   * @param other The orientation to calculate the dot product to.
   * @returns The dot product.
   */
  dot(other: Orientation3D): number {
    return (
      this.pitch * other.pitch +
      this.yaw * other.yaw +
      this.roll * other.roll
    );
  }

  /**
   * Copy the orientation.
   * @returns A new orientation.
   */
  copy(): Orientation3D {
    return new Orientation3D(this.#orientation);
  }

  /**
   * Convert the orientation to a 3D vector.
   * @returns A new 3D vector.
   */
  toVector(): Vector3D {
    return new Vector3D(this.#orientation);
  }

  /**
   * The orientation as a string.
   */
  toString(): Vector3DString {
    return `${this.pitch},${this.yaw},${this.roll}`;
  }

  /**
   * The orientation as an object.
   */
  toObject(): Orientation3DObject {
    return {
      pitch: this.pitch,
      yaw: this.yaw,
      roll: this.roll,
    };
  }

  /**
   * The orientation as an array.
   */
  toArray(): Vector3DArray {
    return [...this.#orientation];
  }
}

/**
 * A 3D orientation object. This is used to represent a rotation.
 */
export interface Orientation3DObject {
  pitch: number;
  yaw: number;
  roll: number;
}

/**
 * A step in a movement.
 */
export interface MovementStep {
  /** The frame that the step will start on. */
  startFrame: number;
  /** The frame that the step will end on. */
  endFrame: number;
  /** The position that the step will start at. */
  from: Vector3DArray;
  /** The position that the step will end at. */
  to: Vector3DArray;
  /** The orientation that the step will start at. */
  orientation: Orientation3DArray;
}

/**
 * A 3D orientation array. This is used to represent a rotation.
 */
export type Orientation3DArray = [number, number, number];

/**
 * A movement is a set of instructions that are executed over a period of time.
 */
export class Movement {
  // The unique identifier for the movement. */
  readonly id: string;
  // The entity that the movement is running on. */
  readonly entitiy: Entity;
  // The engine that the movement is running on. */
  readonly engine: Engine;
  // The frame that the movement started on. */
  readonly startFrame: number;
  // The frame that the movement will end on. */
  readonly endFrame: number;
  // The abort controller that is used to cancel the movement. */
  readonly abort = new AbortController();
  // The signal that is used to cancel the movement. */
  readonly signal = this.abort.signal;

  // The steps that the movement will take. */
  readonly #steps: MovementStep[] = [];

  constructor({
    id = crypto.randomUUID(),
    entity,
    engine,
    steps = [],
  }: MovementOptions) {
    this.id = id ?? crypto.randomUUID();
    this.entitiy = entity;
    this.engine = engine;

    if (!steps.length) {
      throw new Error("A movement must have at least one step.");
    }

    // Sort the steps by their start frame.
    const sortedSteps = [...steps]
      .sort((a, b) => a.startFrame - b.startFrame);

    // Set the start and end frames.
    this.startFrame = sortedSteps[0].startFrame;
    this.endFrame = steps[sortedSteps.length - 1].endFrame;

    // Add the steps to the movement.
    for (const step of sortedSteps) {
      this.#steps.push(step);
    }
  }

  /**
   * Whether or not the movement is completed.
   */
  get completed(): boolean {
    return this.engine.time >= this.endFrame;
  }

  /**
   * The number of frames remaining until the movement is completed.
   */
  get remaining(): number {
    return this.completed ? 0 : this.endFrame - this.engine.time;
  }

  /**
   * The current step that the movement is on.
   * If the movement is not currently running, this will be undefined.
   */
  get currentStep(): DeepReadonly<MovementStep> | undefined {
    return this.#steps.find((step) => {
      return step.startFrame <= this.engine.time &&
        step.endFrame >= this.engine.time;
    });
  }

  /**
   * The next step that the movement will take.
   * If the movement is not currently running, this will be undefined.
   */
  get nextStep(): DeepReadonly<MovementStep> | undefined {
    return this.#steps.find((step) => {
      return step.startFrame > this.engine.time;
    });
  }

  /**
   * The previous step that the movement has completed.
   * If the movement is not currently running, this will be undefined.
   */
  get previousStep(): DeepReadonly<MovementStep> | undefined {
    return this.#steps.find((step) => {
      return step.endFrame < this.engine.time;
    });
  }

  /**
   * The steps that the movement takes.
   */
  get steps(): DeepReadonly<MovementStep[]> {
    return this.#steps;
  }

  /**
   * The steps that the movement has already completed.
   * If the movement is not currently running, this will be an empty array.
   */
  get previousSteps(): DeepReadonly<MovementStep[]> {
    return this.#steps.filter((step) => {
      return step.endFrame < this.engine.time;
    });
  }

  /**
   * The steps that the movement has not yet started.
   * If the movement has completed, this will be an empty array.
   */
  get futureSteps(): DeepReadonly<MovementStep[]> {
    return this.#steps.filter((step) => {
      return step.startFrame > this.engine.time;
    });
  }

  /**
   * Update the movement. This will be called by the engine.
   */
  update(): boolean {
    if (this.completed) {
      throw new Error("Movement is completed.");
    } else if (this.signal.aborted) {
      throw new Error("Movement is aborted.");
    }

    // Update the location and orientation of the entity
    // by interpolating between the current step's from and to.

    const { currentStep, engine, entitiy } = this;

    if (!currentStep) {
      throw new Error("Movement is not running.");
    }

    const currentLocation = entitiy.location;
    const currentOrientation = entitiy.orientation;

    // Calculate the next location
    const nextLocation = Vector3D.interpolate(
      currentLocation,
      Vector3D.fromArray(currentStep.to as Vector3DArray),
      engine.time / currentStep.endFrame,
    );

    // Calculate the next orientation
    const nextOrientation = Orientation3D.interpolate(
      currentOrientation,
      Orientation3D.fromArray(currentStep.orientation as Orientation3DArray),
      engine.time / currentStep.endFrame,
    );

    // Update the entity
    this.entitiy.setLocation(nextLocation);
    this.entitiy.setOrientation(nextOrientation);

    return this.futureSteps.length === 0;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `Movement<${this.id}>`;
  }

  [Symbol.for("deno.customInspect")](): string {
    return `Movement<${this.id}>`;
  }

  [Symbol.toStringTag] = "Movement";
}
