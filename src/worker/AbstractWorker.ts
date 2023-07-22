export interface AbstractWorkerOptions {
  maxConcurrency?: number;
}

export abstract class AbstractWorker {
  readonly maxConcurrency: number;

  #currentConcurrency = 0;

  constructor({
    maxConcurrency = 1,
  }: AbstractWorkerOptions = {}) {
    this.maxConcurrency = maxConcurrency;
  }

  get currentConcurrency(): number {
    return this.#currentConcurrency;
  }
}
