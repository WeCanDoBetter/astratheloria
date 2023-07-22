import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "http";
import { WebSocketServer } from "ws";

/** The version of the lobby API. */
export const LOBBY_API_VERSION = 1;

/** The version of the RTS runtime. */
export const RTS_RUNTIME_VERSION = 1;

/** The version of the Lua runtime. */
export const RTS_RUNTIME_LUA_VERSION = "5.3";

export type SimpleArenaObject = Pick<
  Arena,
  "id" | "name" | "description" | "author" | "homepage" | "versions"
>;

export type RemoveFunctions<T> = {
  [P in keyof T]: T[P] extends Function ? never : T[P];
};

/**
 * An arena is a map that the game is played on. It contains information about
 * the map, such as the name, author, and description.
 */
export interface Arena {
  /**
   * The id of the arena. This is a UUID that is used to identify the arena.
   */
  readonly id: string;
  /**
   * The name of the arena. This is the name that is displayed to the user.
   */
  readonly name: string;
  /**
   * The description of the arena. This is the description that is displayed to
   * the user.
   */
  readonly description?: string;
  /**
   * The author of the arena. This is the author that is displayed to the user.
   */
  readonly author?: string;
  /**
   * The homepage of the arena. This is the homepage that is displayed to the
   * user.
   */
  readonly homepage?: URL;

  /**
   * The versions of the arena. This is a list of versions that the arena
   * supports.
   */
  readonly versions: DeepReadonly<{
    /** The version of the runtime that the arena supports. */
    runtime: number;
    /** The version of the Lua runtime that the arena supports. */
    lua: string;
  }>;

  /**
   * Converts the arena to an object. The returned object contains all the
   * information about the arena.
   */
  toObject(): RemoveFunctions<Arena>;

  /**
   * Converts the arena to a simple object. The returned object is mean to be
   * used with serialization, and contains only the necessary information.
   */
  toSimpleObject(): SimpleArenaObject;
}

export interface LobbyAnnouncer {
  url: URL;
  authorization?: string;
}

export interface LobbyGameServerOptions {
  /** The host that the server will listen on. */
  host: string;
  /** The port that the server will listen on. */
  port: number;
}

export interface LobbyGameOptions {
  /** The lobby provider to use. */
  provider: LobbyProvider;
  /** The announcers that are in the game. */
  announcers: LobbyAnnouncer[];
  /** The territory that is in the game. */
  arena: Arena;
  /** The server that the game is running on. */
  server?: Partial<LobbyGameServerOptions>;
  /** The identity to use for the game. */
  identity?: Identity;
}

/**
 * An identity is used to sign and verify messages. It is used to prove that a
 * message came from a specific source.
 */
export class Identity extends EventTarget {
  /** Hashed identity. */
  #identity: string | undefined;
  /** The key pair that is used to sign and verify messages. */
  #keyPair?: CryptoKeyPair;
  /** The exported public key. */
  #exportedPublicKey?: string;

  constructor(keyPair?: CryptoKeyPair) {
    super();
    this.#keyPair = keyPair;

    if (!this.usable) {
      this.generate().catch((error) => {
        this.dispatchEvent(new ErrorEvent("error", { error }));
      });
    }
  }

  /**
   * Gets whether or not the identity has a key pair.
   */
  get usable(): boolean {
    return !!this.#keyPair;
  }

  /**
   * Gets the identity of the identity. This is the SHA-256 hash of the public
   * key. This is used to identify the identity.
   */
  get identity(): string | undefined {
    return this.#identity;
  }

  /**
   * Gets the identity's public key.
   */
  get publicKey(): CryptoKey | undefined {
    return this.#keyPair?.publicKey;
  }

  /**
   * Exports the public key as a hex-encoded string.
   * @returns The exported public key.
   */
  async exportPublicKey(): Promise<string> {
    if (!this.usable) {
      throw new Error("Identity does not have a key pair");
    } else if (this.#exportedPublicKey) {
      return this.#exportedPublicKey;
    }

    this.#exportedPublicKey = Buffer.from(
      JSON.stringify(
        await crypto.subtle.exportKey(
          "jwk",
          this.#keyPair!.publicKey,
        ),
      ),
    ).toString("hex");

    return this.#exportedPublicKey;
  }

  /**
   * Signs the data with the identity's private key.
   * @param data The data to sign.
   * @returns The signature of the data.
   */
  async sign(data: string | ArrayBuffer): Promise<string> {
    if (!this.usable) {
      throw new Error("Identity does not have a key pair");
    }

    try {
      return new TextDecoder().decode(
        await crypto.subtle.sign(
          {
            name: "ECDSA",
            hash: "SHA-256",
          },
          this.#keyPair!.privateKey,
          typeof data === "string" ? new TextEncoder().encode(data) : data,
        ),
      );
    } catch (error) {
      throw new AggregateError([error], "Error signing data");
    }
  }

  /**
   * Verifies the signature of the data with the identity's public key.
   * @param signature The signature to verify.
   * @param data The data to verify.
   * @returns Whether or not the signature is valid.
   */
  async verify(
    signature: string | ArrayBuffer,
    data: string | ArrayBuffer,
  ): Promise<boolean> {
    if (!this.usable) {
      throw new Error("Identity does not have a key pair");
    }

    return crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: "SHA-256",
      },
      this.#keyPair!.publicKey,
      typeof signature === "string"
        ? new TextEncoder().encode(signature)
        : signature,
      typeof data === "string" ? new TextEncoder().encode(data) : data,
    );
  }

  private async generate(): Promise<void> {
    if (this.usable) {
      throw new Error("Identity already has a key pair");
    }

    this.#keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign", "verify"],
    );

    this.#identity = Buffer.from(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(await this.exportPublicKey()),
      ),
    ).toString("hex");
  }
}

export class Participant {
  /** The identity of the participant. */
  readonly identity: string;
  /** The socket of the participant. */
  readonly socket: WebSocket;

  /** The public key of the participant. */
  #publicKey: CryptoKey | undefined;

  constructor(identity: string, publicKey: string, socket: WebSocket) {
    this.identity = identity;
    this.socket = socket;

    // Import public key
    crypto.subtle.importKey(
      "jwk",
      JSON.parse(Buffer.from(publicKey, "hex").toString("utf8")),
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false,
      ["verify"],
    ).then((key) => {
      this.#publicKey = key;
    });
  }

  get usable(): boolean {
    return !!this.#publicKey;
  }

  get publicKey(): CryptoKey | undefined {
    return this.#publicKey;
  }

  verify(signature: string | ArrayBuffer, data: string | ArrayBuffer) {
    if (!this.#publicKey) {
      throw new Error("Participant does not have a public key");
    }

    return crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: "SHA-256",
      },
      this.#publicKey,
      typeof signature === "string"
        ? new TextEncoder().encode(signature)
        : signature,
      typeof data === "string" ? new TextEncoder().encode(data) : data,
    );
  }

  /**
   * Sends a message to the participant. The message will be signed with the
   * identity's private key.
   * @param identity The identity to send the message as.
   * @param message The message to send.
   */
  async send(
    identity: Identity,
    message: Record<string, unknown>,
  ): Promise<void> {
    if (this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Socket is not open");
    }

    // Create signature
    const signature = await identity.sign(JSON.stringify(message));
    const messageBuf = new TextEncoder().encode(
      JSON.stringify({ signature, message }),
    );

    this.socket.send(messageBuf);
  }

  /**
   * Closes the socket. This will send a close frame to the participant.
   * @param code The code to close the socket with.
   * @param reason The reason to close the socket with.
   */
  close(code?: number, reason?: string): void {
    this.socket.close(code, reason);
  }
}

export interface LobbyProvider {
  announce(
    id: string,
    host: string,
    port: number,
    arena: SimpleArenaObject,
  ): Promise<void>;
}

export class GameLobby {
  /** The id of the lobby. */
  readonly id = crypto.randomUUID();
  /** The identity of the owner of the lobby. */
  readonly identity: Identity;

  /** The lobby provider that is used to announce the game. */
  #provider: LobbyProvider;
  /** The arena that the game is using. */
  #arena: Arena;
  /** The announcers that are added to the lobby. */
  #announcers: Set<LobbyAnnouncer>;

  /** The server options that the game is using. */
  #serverOptions: LobbyGameServerOptions;
  /** The server that the game is running on. */
  #server: Server;
  /** The websocket server that the game is running on. */
  #wsServer: WebSocketServer;

  /** The participants that are in the lobby. */
  #participants: Set<Participant> = new Set();

  constructor(options: LobbyGameOptions) {
    this.#provider = options.provider;
    this.#arena = options.arena;
    this.#announcers = new Set(options.announcers);
    this.identity = options.identity ?? new Identity();

    this.#serverOptions = {
      host: "localhost",
      port: 8657,
      ...options.server,
    };

    this.#server = createServer(this.handleRequest.bind(this));
    this.#wsServer = new WebSocketServer({ noServer: true });
    this.#wsServer.on("connection", this.handleConnection.bind(this));
  }

  /**
   * The lobby provider that is used to announce the game.
   */
  get provider(): LobbyProvider {
    return this.#provider;
  }

  /**
   * The arena that the game is using.
   */
  get arena(): DeepReadonly<Arena> {
    return this.#arena;
  }

  /**
   * The participants that are in the lobby.
   */
  get participants(): ReadonlySet<Participant> {
    return this.#participants;
  }

  /**
   * Gets the announcers that are in the game.
   */
  get announcers(): ReadonlySet<LobbyAnnouncer> {
    return this.#announcers;
  }

  /**
   * Adds the announcers to the game.
   * @param announcers The announcers to add to the game.
   */
  addAnnouncers(
    ...announcers: LobbyAnnouncer[]
  ): GameLobby {
    if (announcers.length) {
      for (const announcer of announcers) {
        this.#announcers.add(announcer);
      }
    }

    return this;
  }

  /**
   * Announces the game to the announcers. This will send a POST request to all
   * of the announcers with the game's information.
   * @returns A promise that resolves when all of the announcers have been
   * announced to.
   * @throws {Error} Throws an error if there are no announcers to announce to.
   */
  async announce(): Promise<PromiseSettledResult<Response>[]> {
    if (!this.#announcers.size) {
      throw new Error("No announcers to announce to");
    }

    const { host, port } = this.#serverOptions;
    const arena = this.#arena.toSimpleObject();

    const results = await Promise.allSettled(
      [...this.#announcers].map(async (announcer) => {
        const url = new URL("/lobby/announce/", announcer.url);

        const bodyBuf = new TextEncoder().encode(
          JSON.stringify({
            id: this.id,
            host,
            port,
            arena,
          }),
        );

        const signature = await this.identity.sign(bodyBuf);
        const headers: Record<string, string> = {};

        if (announcer.authorization) {
          headers["Authorization"] = `Bearer ${announcer.authorization}`;
        }

        const response = await fetch(url, {
          method: "POST",
          body: bodyBuf,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": `${bodyBuf.byteLength}`,
            "Identity": this.identity.identity!,
            "Signature": signature,
            "Api-Version": `${LOBBY_API_VERSION}`,
            "Runtime-Version": `${RTS_RUNTIME_VERSION}`,
            "Lua-Version": `${RTS_RUNTIME_LUA_VERSION}`,
            ...headers,
          },
        });

        if (!response.ok) {
          const { message } = await response.json() as { message: string };
          throw new Error(message);
        }

        return response;
      }),
    );

    return results;
  }

  /**
   * Starts listening for connections.
   * @param options The options to use when listening.
   * @param options.signal The signal to use to abort the listen.
   * @returns A promise that resolves when the server is closed.
   */
  listen({ signal }: { signal?: AbortSignal }): Promise<void> {
    return new Promise<void>((resolve) => {
      const { host, port } = this.#serverOptions;

      this.#server.listen(port, host, () => {
        this.#server.once("close", () => resolve());
        signal?.addEventListener("abort", () => this.close(), { once: true });
      });
    });
  }

  /**
   * Unicasts a message to a participant.
   * @param identity The identity of the participant to unicast to.
   * @param message The message to unicast.
   */
  async unicast(
    identity: string,
    message: Record<string, unknown>,
  ): Promise<void> {
    const participant = [...this.#participants].find(
      (participant) => participant.identity === identity,
    );

    if (!participant) {
      throw new Error(`Participant ${identity} not found.`);
    }

    try {
      await participant.send(this.identity, message);
    } catch (error) {
      participant.close();

      throw new AggregateError(
        [error],
        `Failed to unicast to ${participant.identity}.`,
      );
    }
  }

  /**
   * Multicasts a message to a list of participants.
   * @param identities The identities of the participants to multicast to.
   * @param message The message to multicast.
   */
  async multicast(
    identities: string[],
    message: Record<string, unknown>,
  ) {
    for (const identity of identities) {
      await this.unicast(identity, message);
    }
  }

  /**
   * Broadcasts a message to all participants, excluding the ones specified.
   * @param message The message to broadcast.
   * @param exclude The identities to exclude from the broadcast.
   */
  broadcast(
    message: Record<string, unknown>,
    exclude: string[] = [],
  ): Promise<PromiseSettledResult<void>[]> {
    return Promise.allSettled(
      [...this.#participants]
        .filter((participant) => !exclude.includes(participant.identity))
        .map((participant) => participant.send(this.identity, message)),
    );
  }

  /**
   * Omnicasts a message to all participants.
   * @param message The message to omnicast.
   */
  omnicast(message: Record<string, unknown>) {
    return this.broadcast(message);
  }

  /**
   * Closes the server.
   * @param force Whether or not to force close the server.
   */
  close(force = false) {
    this.#server.close();

    if (force) {
      for (const participant of this.#participants) {
        participant.close();
      }
    }
  }

  /**
   * Handles a request to the server.
   * @param req The request.
   * @param res The response.
   */
  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const expectedPath = `/lobby/${this.id}/socket/`;

    if (req.url !== expectedPath) {
      const bodyBuf = new TextEncoder().encode(
        JSON.stringify({ message: "Invalid path." }),
      );

      const publicKey = await this.identity.exportPublicKey();
      const signature = await this.identity.sign(bodyBuf);

      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Length", `${bodyBuf.byteLength}`);
      res.setHeader("API-Version", `${LOBBY_API_VERSION}`);
      res.setHeader("Runtime-Version", `${RTS_RUNTIME_VERSION}`);
      res.setHeader("Lua-Version", `${RTS_RUNTIME_LUA_VERSION}`);
      res.setHeader("Identity", publicKey);
      res.setHeader("Signature", signature);
      res.end(bodyBuf);
      res.end();
      return;
    }

    const publicKey = req.headers["Public-Key"] as string;

    let identity: string | undefined;
    let errorMessage: string | undefined;

    if (typeof publicKey !== "string" || !publicKey.length) {
      errorMessage = "Missing public key.";
    } else {
      identity = Buffer.from(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(publicKey),
        ),
      ).toString("hex");
    }

    if (errorMessage) {
      const bodyBuf = new TextEncoder().encode(
        JSON.stringify({ message: errorMessage }),
      );

      const publicKey = await this.identity.exportPublicKey();
      const signature = await this.identity.sign(bodyBuf);

      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Length", `${bodyBuf.byteLength}`);
      res.setHeader("Api-Version", `${LOBBY_API_VERSION}`);
      res.setHeader("Runtime-Version", `${RTS_RUNTIME_VERSION}`);
      res.setHeader("Lua-Version", `${RTS_RUNTIME_LUA_VERSION}`);
      res.setHeader("Public-Key", publicKey);
      res.setHeader("Signature", signature);
      res.end(bodyBuf);
      return;
    }

    this.#wsServer.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
      this.#wsServer.emit("connection", ws, req, identity, publicKey);
    });
  }

  /**
   * Handles a connection to the websocket server.
   * @param ws The websocket.
   * @param req The request.
   */
  private handleConnection(
    ws: WebSocket,
    req: IncomingMessage,
    identity: string,
    publicKey: string,
  ) {
    const participant = new Participant(identity, publicKey, ws);
    this.#participants.add(participant);

    ws.addEventListener("message", async ({ data }) => {
      try {
        const { signature, message } = JSON.parse(data);

        if (typeof signature !== "string" || !signature.length) {
          throw new Error("Missing signature");
        }

        if (typeof message !== "object" || message === null) {
          throw new Error("Missing message");
        }

        if (await participant.verify(signature, JSON.stringify(message))) {
          this.handleMessage(message);
        }
      } catch (_error) {}
    });

    ws.addEventListener("close", () => {
      this.#participants.delete(participant);
    }, { once: true });
  }

  private handleMessage(message: Record<string, unknown>) {
    // TODO: Handle messages
  }
}

export interface ChatMessage {
  id: string;
  identity: string;
  createdAt: Date;
  message: string;
}

export class GameLobbyChat {
  /** The lobby that the chat is in. */
  readonly lobby: GameLobby;

  /** The messages of the chat. */
  #messages: Set<ChatMessage> = new Set();

  constructor(lobby: GameLobby) {
    this.lobby = lobby;
  }

  /**
   * Gets the identity of the chat. lobby.
   */
  get identity(): Identity {
    return this.lobby.identity;
  }

  /**
   * Gets the participants of the chat lobby.
   */
  get participants(): ReadonlySet<Participant> {
    return this.lobby.participants;
  }

  /**
   * Gets the messages of the chat lobby.
   */
  get messages(): ReadonlySet<ChatMessage> {
    return this.#messages;
  }

  /**
   * Deletes a message from the chat.
   * @param id The id of the message to delete.
   * @throws {Error} Throws an error if the message is not found.
   * @returns Whether or not the message was deleted.
   */
  deleteMessage(id: string): boolean {
    const message = [...this.#messages].find((message) => message.id === id);

    if (!message) {
      throw new Error(`Message ${id} not found.`);
    }

    return this.#messages.delete(message);
  }

  /**
   * Pushes a message to the chat.
   * @param message The message to push.
   * @throws {Error} Throws an error if the participant is not found.
   */
  async push(message: ChatMessage) {
    const sender = [...this.lobby.participants].find(
      (participant) => participant.identity === message.identity,
    );

    if (!sender) {
      throw new Error(`Participant ${message.identity} not found.`);
    }

    try {
      await this.broadcast(message, [sender.identity]);
    } finally {
      this.#messages.add(message);
    }
  }

  /**
   * Broadcasts a message to all participants, excluding the ones specified.
   * @param message The message to broadcast.
   * @param exclude The identities to exclude from the broadcast.
   */
  private broadcast(
    message: ChatMessage,
    exclude: string[] = [],
  ): Promise<PromiseSettledResult<void>[]> {
    return this.lobby.broadcast(
      message as unknown as Record<string, unknown>,
      exclude,
    );
  }
}

export type DeepReadonly<T> = T extends (infer R)[] ? DeepReadonlyArray<R>
  : T extends Function ? T
  : T extends object ? DeepReadonlyObject<T>
  : T;

type DeepReadonlyArray<T> = ReadonlyArray<DeepReadonly<T>>;
type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};
