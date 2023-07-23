import { Identity } from "./lobby.js";

/**
 * A file system metadata object.
 */
export interface FileMetadata {
  /** The version of the file. */
  version?: number | string;
  /** The description of the file. */
  description?: string;
  /** The author of the file. */
  author?: string;
  /** The license of the file. */
  license?: string;
  /** The homepage of the file. */
  homepage?: string;
  /** The repository of the file. */
  repository?: string;
  /** The tags of the file. */
  tags?: string[];
}

/**
 * A file system stat object.
 */
export interface FileInfo {
  /** The path to the file. */
  path: string;
  /** Whether the file is a directory. */
  isDirectory: boolean;
  /** The MIME type of the file. */
  mimeType?: string;
  /** The size of the file in bytes. */
  size: number;
  /** The timestamp when the file was created. */
  created: number;
  /** The timestamp when the file was last modified. */
  lastModified: number;
  /** The permissions of the file. */
  permissions: Permissions;
  /** The metadata of the file. */
  metadata: FileMetadata;
  /** The content of the file. */
  content?: Promise<DownloadProgress>;
}

export interface DownloadProgressOptions {
  /** The total number of bytes to download. */
  total: number;
  /** The abort signal. */
  signal?: AbortSignal;
}

/**
 * Download progress stream. This stream is used to track the progress of a
 * download. This stream is a readable stream.
 */
export class DownloadProgress implements AsyncIterator<Uint8Array> {
  /** The total size of the file in bytes. */
  readonly total: number;

  /** The number of bytes loaded. */
  #loaded = 0;
  /** The abort signal. */
  #signal?: AbortSignal;

  constructor({ signal, total }: DownloadProgressOptions) {
    this.total = total;
    this.#signal = signal;
  }

  /** The number of bytes loaded. */
  get loaded(): number {
    return this.#loaded;
  }

  /** The number of bytes remaining. */
  get remaining(): number {
    return this.total - this.#loaded;
  }

  /** Whether the download is completed. */
  get completed(): boolean {
    return this.#loaded >= this.total;
  }

  async next(
    ...args: [] | [undefined]
  ): Promise<IteratorResult<Uint8Array, any>> {
    if (this.#signal?.aborted) {
      throw new Error("Download aborted.");
    } else if (this.completed) {
      return { done: true, value: undefined };
    }

    // wait for the next chunk and return it
    throw new Error("Method not implemented.");
  }
}

export interface FileSystemProvider {
  /** The protocol of the file system. */
  readonly protocol: string;

  /**
   * Read the contents of a file.
   * @param url The url to the file to read.
   * @throws {Error} If the file does not exist.
   * @throws {PermissionError} If the file cannot be read.
   */
  get(url: URL): Promise<FileInfo>;

  /**
   * Write the contents of a file.
   * @param url The url to the file to write.
   * @param data The data to write to the file.
   * @param permissions The permissions of the file.
   * @throws {PermissionError} If the file cannot be written.
   * @returns The file info of the file.
   */
  put(
    url: URL,
    data: Uint8Array,
    permissions?: Permissions,
  ): Promise<FileInfo>;

  /**
   * List the contents of a directory.
   * @param path The path to the directory to list.
   * @throws {Error} If the file does not exist.
   * @throws {Error} If the file is not a directory.
   */
  list(url: URL): Promise<FileInfo[]>;

  /**
   * Delete a file.
   * @param url The url to the file to delete.
   * @throws {Error} If the file does not exist.
   * @throws {Error} If the file is a directory.
   * @throws {Error} If the file cannot be deleted.
   * @throws {Error} If the permissions are invalid.
   */
  delete(url: URL): Promise<void>;

  /**
   * Copy a file or directory.
   * @param source The path to the file to copy.
   * @param destination The path to the destination file.
   * @throws {Error} If the source file does not exist.
   * @throws {PermissionError} If the source file cannot be read.
   * @throws {Error} If the destination file already exists.
   * @throws {PermissionError} If the destination file cannot be written.
   * @returns The file info of the destination file.
   */
  copy(source: URL, destination: URL): Promise<FileInfo>;
}

/**
 * An abstract file system which supports arbitrary binary data.
 */
export class HydraFileSystem extends EventTarget {
  #identity: Identity;
  #providers: FileSystemProvider[] = [];

  constructor(
    identity: Identity,
    providers: FileSystemProvider | FileSystemProvider[],
  ) {
    super();
    this.#identity = identity;
    this.#providers = Array.isArray(providers) ? providers : [providers];
  }

  get identity(): Identity {
    return this.#identity;
  }

  /**
   * Select a provider for a given url.
   * @param url The url to validate.
   * @throws {Error} If the url is invalid.
   * @returns The provider for the url.
   */
  selectProvider(url: URL): FileSystemProvider | void {
    const checkProvider = (provider: FileSystemProvider) => {
      if (url.protocol === provider.protocol) {
        return true;
      }
    };

    for (const provider of this.#providers) {
      if (checkProvider(provider)) {
        return provider;
      }
    }
  }

  /**
   * Read the contents of a file.
   * @param url The url to the file to read.
   * @throws {Error} If the file does not exist.
   * @throws {PermissionError} If the file cannot be read.
   */
  get(url: URL): Promise<FileInfo> {
    const provider = this.selectProvider(url);

    if (!provider) {
      throw new Error(`No provider for protocol: ${url.protocol}`);
    }

    return provider.get(url);
  }

  /**
   * Write the contents of a file.
   * @param url The url to the file to write.
   * @param data The data to write to the file.
   * @param permissions The permissions of the file.
   * @throws {PermissionError} If the file cannot be written.
   * @returns The file info of the file.
   */
  put(
    url: URL,
    data: Uint8Array,
    permissions?: Permissions,
  ): Promise<FileInfo> {
    const provider = this.selectProvider(url);

    if (!provider) {
      throw new Error(`No provider for protocol: ${url.protocol}`);
    }

    return provider.put(url, data, permissions);
  }

  /**
   * List the contents of a directory.
   * @param path The path to the directory to list.
   * @throws {Error} If the file does not exist.
   * @throws {Error} If the file is not a directory.
   */
  list(url: URL): Promise<FileInfo[]> {
    const provider = this.selectProvider(url);

    if (!provider) {
      throw new Error(`No provider for protocol: ${url.protocol}`);
    }

    return provider.list(url);
  }

  /**
   * Delete a file.
   * @param url The url to the file to delete.
   * @throws {Error} If the file does not exist.
   * @throws {Error} If the file is a directory.
   * @throws {Error} If the file cannot be deleted.
   * @throws {Error} If the permissions are invalid.
   */
  async delete(url: URL): Promise<void> {
    const provider = this.selectProvider(url);

    if (!provider) {
      throw new Error(`No provider for protocol: ${url.protocol}`);
    }

    return provider.delete(url);
  }

  /**
   * Copy a file or directory.
   * @param source The path to the file to copy.
   * @param destination The path to the destination file.
   * @throws {Error} If the source file does not exist.
   * @throws {PermissionError} If the source file cannot be read.
   * @throws {Error} If the destination file already exists.
   * @throws {PermissionError} If the destination file cannot be written.
   * @throws {FileSystemError} If the source and destination file systems are different.
   * @returns The file info of the destination file.
   */
  copy(source: URL, destination: URL): Promise<FileInfo> {
    const sourceProvider = this.selectProvider(source);
    const destinationProvider = this.selectProvider(destination);

    if (!sourceProvider) {
      throw new Error(`No provider for protocol: ${source.protocol}`);
    } else if (!destinationProvider) {
      throw new Error(`No provider for protocol: ${destination.protocol}`);
    } else if (sourceProvider !== destinationProvider) {
      throw new FileSystemError(
        this,
        "E_CROSS_FILE_SYSTEM",
        `Cannot copy between different file systems: ${source} -> ${destination}`,
      );
    }

    return sourceProvider.copy(source, destination);
  }
}

/**
 * A file system error.
 */
export class FileSystemError extends AggregateError {
  /** The code of the error. */
  readonly code: string;
  /** The file system which caused the error. */
  readonly fs: HydraFileSystem;

  constructor(fs: HydraFileSystem, code: string, message: string) {
    super(message);
    this.fs = fs;
    this.code = code;
  }
}

/**
 * A file system permission error. This error is thrown when a file system
 * operation is not permitted.
 */
export class PermissionError extends FileSystemError {
  constructor(fs: HydraFileSystem, message?: string) {
    super(fs, "E_PERM", message ?? "Permission denied.");
  }
}
