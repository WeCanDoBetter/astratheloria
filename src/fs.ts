export interface InventoryItemMetadata {
  name: string;
  description: string;
  author: string;
  license: string;
  homepage: string;
  repository: string;
  tags: string[];
}

export interface InventoryItem<
  Content = unknown,
  Path extends string = string,
> {
  path: Path;
  hash: string;
  mktime: number;
  mdtime: number;
  size: number;
  content: Content;
  metadata: Partial<InventoryItemMetadata>;
}

export type InventoryItemSimple<
  Content = unknown,
  Path extends string = string,
> = Pick<InventoryItem<Content, Path>, "path" | "content" | "metadata">;

const globRegex = /(\*\*\/)|(\*)|(\?)/g;
const globRegexReplacements: Record<string, string> = {
  "**/": "(?:.+/)?",
  "*": "[^/]*",
  "?": "[^/]",
};

export function globToRegex(glob: string) {
  return glob.replace(globRegex, (match) => globRegexReplacements[match]);
}

export class Inventory extends EventTarget {
  #itemsByPath = new Map<string, InventoryItem>();
  #itemsByHash = new Map<string, InventoryItem>();

  /**
   * Add items to the inventory. If an item with the same path already exists,
   * it will be overwritten.
   * @param items The items to add to the inventory.
   */
  async set<Content = unknown, Path extends string = string>(
    ...items: InventoryItemSimple<Content, Path>[]
  ) {
    for (const item of items) {
      const current = this.#itemsByPath.get(item.path);
      const hash = await digest(item.content as ArrayBuffer | ArrayBufferView);
      const { byteLength } = item.content as ArrayBuffer | ArrayBufferView;

      const now = Date.now();
      const fullItem: InventoryItem<Content, Path> = {
        mktime: now,
        mdtime: now,
        ...current,
        ...item,
        size: byteLength,
        hash: [...new Uint8Array(hash)]
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join(""),
        metadata: {
          ...current?.metadata,
          ...item.metadata,
        },
      };

      this.#itemsByPath.set(item.path, fullItem);
      this.#itemsByHash.set(fullItem.hash, fullItem);
      this.dispatchEvent(new CustomEvent("set", { detail: fullItem }));
    }
  }

  /**
   * Get an item from the inventory using a glob pattern. If the glob does not
   * match any items, an empty array will be returned.
   * @param glob The glob to match against the inventory items.
   * @returns The items that match the glob.
   */
  get<Content = unknown, Path extends string = string>(
    glob: Path,
  ): InventoryItem<Content, Path>[] {
    const regex = new RegExp(`^${globToRegex(glob)}$`);

    return [
      ...this.#itemsByPath.values() as Iterable<InventoryItem<Content, Path>>,
    ]
      .filter((item) => regex.test(item.path));
  }

  /**
   * Delete an item from the inventory.
   * @param path The path of the item to delete.
   * @returns Whether the item was deleted.
   */
  del(path: string): boolean {
    const item = this.#itemsByPath.get(path);

    if (!item) {
      return false;
    }

    this.#itemsByPath.delete(path);
    this.#itemsByHash.delete(item.hash);
    this.dispatchEvent(new CustomEvent("del", { detail: item }));

    return true;
  }

  /**
   * Dump all items in the inventory.
   * @returns All items in the inventory.
   */
  dump(): InventoryItem[] {
    return [...this.#itemsByPath.values()];
  }

  /**
   * Iterate over all items in the inventory.
   */
  [Symbol.iterator]() {
    return this.#itemsByPath.values();
  }

  [Symbol.toStringTag] = "Inventory";

  toString() {
    return `Inventory(${this.#itemsByPath.size} items)`;
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }

  [Symbol.for("Deno.customInspect")]() {
    return this.toString();
  }
}

export function digest(content: string | ArrayBuffer | ArrayBufferView) {
  return crypto.subtle.digest(
    "SHA-256",
    typeof content === "string" ? new TextEncoder().encode(content) : content,
  );
}
