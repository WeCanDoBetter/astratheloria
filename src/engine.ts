import type { Engine as EngineInterface, Entity, Fragment } from "./loop.js";

export class Engine extends EventTarget implements EngineInterface {
  #time = 0;

  #entities: Set<Entity> = new Set();
  #fragments: Set<Fragment> = new Set();

  get time(): number {
    return this.#time;
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

  async update(): Promise<number> {
    this.#time += 1;
    return this.#time;
  }
}
