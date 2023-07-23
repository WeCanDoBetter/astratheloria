import type { Engine as EngineInterface, Entity, Fragment } from "./loop.js";

export class Engine extends EventTarget implements EngineInterface {
  #currentTime = 0;
  #previousTime = 0;

  #entities: Set<Entity> = new Set();
  #fragments: Set<Fragment> = new Set();

  get time(): number {
    return this.#currentTime;
  }

  get previousTime(): number {
    return this.#previousTime;
  }

  get delta(): number {
    return this.#currentTime - this.#previousTime;
  }

  get entities(): ReadonlySet<Entity> {
    return this.#entities;
  }

  get fragments(): ReadonlySet<Fragment> {
    return this.#fragments;
  }

  addEntity(entity: Entity): Engine {
    this.#entities.add(entity);
    return this;
  }

  removeEntity(entity: Entity): Engine {
    this.#entities.delete(entity);
    return this;
  }

  clearFragments(): Engine {
    this.#fragments.clear();
    return this;
  }

  async update(time: number): Promise<void> {
    if (this.#fragments.size) {
      throw new Error("Engine must not have fragments.");
    }

    this.#previousTime = this.#currentTime;
    this.#currentTime = time;

    // TODO: Run engine game loop
  }
}
