/**
 * An inventory item metadata object.
 */
export interface InventoryItemMetadata {
  /** The name of the item. */
  name: string;
  /** A description of the item. */
  description: string;
  /** The author of the item. */
  author: string;
  /** The license of the item. */
  license: string;
  /** The homepage of the item. */
  homepage: string;
  /** The repository of the item. */
  repository: string;
  /** The tags of the item. */
  tags: string[];
}

/**
 * An inventory item.
 * @template Content The type of the content.
 * @template Path The type of the path.
 */
export interface InventoryItem<
  Content = unknown,
  Path extends string = string,
> {
  /** The path of the item. */
  readonly path: Path;
  /** The hash of the item. */
  readonly hash: string;
  /** The time the item was created. */
  readonly mktime: number;
  /** The time the item was last modified. */
  readonly mdtime: number;
  /** The size of the item. */
  readonly size: number;
  /** The content of the item. */
  readonly content: Content;
  /** The metadata of the item. */
  readonly metadata: Partial<InventoryItemMetadata>;
  /** The permissions of the item. */
  readonly permissions: InventoryItemPermissions;
}

/**
 * A simple inventory item. This is used when adding items to the inventory.
 * @template Content The type of the content.
 * @template Path The type of the path.
 */
export type InventoryItemSimple<
  Content = unknown,
  Path extends string = string,
> = Pick<
  InventoryItem<Content, Path>,
  "path" | "content" | "metadata" | "permissions"
>;

const globRegex = /(\*\*\/)|(\*)|(\?)/g;
const globRegexReplacements: Record<string, string> = {
  "**/": "(?:.+/)?",
  "*": "[^/]*",
  "?": "[^/]",
};

/**
 * Convert a glob to a regex. This is used when getting items from the
 * inventory. The glob is converted to a regex, and then the regex is tested
 * against the path of each item in the inventory.
 * @param glob The glob to convert to a regex.
 * @returns The regex that matches the glob.
 */
export function globToRegex(glob: string) {
  return glob.replace(globRegex, (match) => globRegexReplacements[match]);
}

/**
 * An inventory. This is used to store items. Items can be added, retrieved,
 * and deleted from the inventory.
 * @emits set When an item is added to the inventory.
 * @emits del When an item is deleted from the inventory.
 */
export class Inventory extends EventTarget {
  /** The items in the inventory, indexed by path. */
  #itemsByPath = new Map<string, InventoryItem>();
  /** The items in the inventory, indexed by hash. */
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

      if (current) {
        if (
          !hasPermission(
            current.permissions.owner,
            InventoryPermissions.Write,
          )
        ) {
          throw new Error(
            `Inventory item "${item.path}" cannot be overwritten because it is not writable.`,
          );
        }
      }

      const hash = await digest(item.content as ArrayBuffer | ArrayBufferView);
      const hashStr = [...new Uint8Array(hash)]
        .map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const { byteLength } = item.content as ArrayBuffer | ArrayBufferView;

      const now = Date.now();
      const fullItem: InventoryItem<Content, Path> = {
        mktime: now,
        mdtime: now,
        ...current,
        ...item,
        hash: hashStr,
        size: byteLength,
        permissions: {
          ...current?.permissions,
          ...item.permissions,
        },
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
   * Get items from the inventory using a glob pattern. The glob is converted
   * to a regex, and then the regex is tested against the path of each item in
   * the inventory.
   * @param glob The glob to match against the inventory items.
   * @returns The items that match the glob.
   */
  get<Content = unknown, Path extends string = string>(
    glob: Path,
  ): InventoryItem<Content, Path>[] {
    const regex = new RegExp(`^${globToRegex(glob)}$`);

    return [
      ...this.#itemsByPath.values() as Iterable<InventoryItem<Content, Path>>,
    ].filter((item) => regex.test(item.path));
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
    const items = [...this.#itemsByPath.values()];
    this.dispatchEvent(new CustomEvent("dump", { detail: items }));
    return items;
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
    return JSON.stringify(this.dump(), null, 2);
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

// unix-like inventory permissions
export enum InventoryPermissions {
  /** No permissions. */
  None = 0,
  /** Read permission. */
  Read = 1 << 0,
  /** Write permission. */
  Write = 1 << 1,
  /** Execute permission. */
  Execute = 1 << 2,
  /** All permissions. */
  All = Read | Write | Execute,
}

export interface InventoryItemPermissions {
  /** The permissions that the owner has. */
  owner: InventoryPermissions;
  /** The permissions that the group has. */
  group: InventoryPermissions;
  /** The permissions that others have. */
  other: InventoryPermissions;
}

export interface InventoryItemMetadata {
  /** The name of the item. */
  name: string;
  /** A description of the item. */
  description: string;
  /** The author of the item. */
  author: string;
  /** The license of the item. */
  license: string;
  /** The homepage of the item. */
  homepage: string;
  /** The repository of the item. */
  repository: string;
  /** The tags of the item. */
  tags: string[];
}

export function inventoryItemPermissionsToString(
  permissions: InventoryItemPermissions,
) {
  const owner = inventoryPermissionsToString(permissions.owner);
  const group = inventoryPermissionsToString(permissions.group);
  const other = inventoryPermissionsToString(permissions.other);

  return `${owner}${group}${other}`;
}

export function inventoryPermissionsToString(
  permissions: InventoryPermissions,
) {
  return [
    permissions & InventoryPermissions.Read ? "r" : "-",
    permissions & InventoryPermissions.Write ? "w" : "-",
    permissions & InventoryPermissions.Execute ? "x" : "-",
  ].join("");
}

/**
 * Check if the permissions have the permission.
 * @param permissions The permissions to check.
 * @param permission The permission to check for.
 * @returns Whether the permissions have the permission.
 */
export function hasPermission(
  permissions: InventoryPermissions,
  permission: InventoryPermissions,
) {
  return (permissions & permission) === permission;
}
