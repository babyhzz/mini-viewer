export function mergeCommandMap<T extends { targetViewportKey: string }>(
  previous: Record<string, T | null>,
  nextCommands: Record<string, T | null>,
) {
  if (!Object.keys(nextCommands).length) {
    return previous;
  }

  return {
    ...previous,
    ...nextCommands,
  };
}
