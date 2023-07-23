const commandLineArgsRegex =
  /(?<name>[a-zA-Z0-9]+)(?:=(?<value>[a-zA-Z0-9]+))?/g;

/**
 * Parses the command line arguments.
 * @param args The command line arguments.
 * @returns The parsed command line arguments.
 */
export function parseCommandLineArgs<
  Aliases extends Record<string, string | boolean> = Record<
    string,
    string | boolean
  >,
>(
  command: string,
  aliases?: Aliases,
): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};

  for (const match of command.matchAll(commandLineArgsRegex)) {
    const name = match.groups?.name;
    const value = match.groups?.value;

    if (name === undefined) {
      continue;
    }

    if (value === undefined) {
      args[name] = true;
      continue;
    }

    args[name] = value;
  }

  if (aliases !== undefined) {
    for (const [name, value] of Object.entries(args)) {
      if (aliases[name] !== undefined) {
        args[aliases[name] as string] = value;
      }
    }
  }

  return args;
}
