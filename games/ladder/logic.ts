import { makeRng, randInt, shuffle } from "@/lib/random";

export const MIN_LADDER_PLAYERS = 2;
export const MAX_LADDER_PLAYERS = 6;

export interface LadderInput {
  players: readonly string[];
  outcomes: readonly string[];
  seed: number;
}

export interface LadderRung {
  id: string;
  row: number;
  /** Adjacent bridge, or a wraparound portal joining the two edge columns. */
  kind: "bridge" | "portal";
  fromColumn: number;
  toColumn: number;
  /** Normalized top-to-bottom position in (0, 1). */
  progress: number;
}

export interface LadderPathPoint {
  column: number;
  /** Normalized top-to-bottom position in [0, 1]. */
  progress: number;
  /** How this point was reached from the previous point. */
  via?: LadderRung["kind"];
}

export interface LadderAssignment {
  playerIndex: number;
  outcomeIndex: number;
  player: string;
  outcome: string;
  path: LadderPathPoint[];
}

export interface LadderRound {
  players: string[];
  outcomes: string[];
  seed: number;
  rungs: LadderRung[];
  /** `permutation[playerIndex]` is the reached outcome index. */
  permutation: number[];
  assignments: LadderAssignment[];
}

export function cleanLadderLabels(labels: readonly string[]): string[] {
  return labels.map((label) => label.trim());
}

export function isValidLadderSetup(
  players: readonly string[],
  outcomes: readonly string[],
): boolean {
  if (players.length !== outcomes.length) return false;
  if (
    players.length < MIN_LADDER_PLAYERS ||
    players.length > MAX_LADDER_PLAYERS
  ) {
    return false;
  }
  return [...players, ...outcomes].every((label) => label.trim().length > 0);
}

type LadderConnection = Pick<
  LadderRung,
  "kind" | "fromColumn" | "toColumn"
>;

function connectionKey(order: readonly number[], portalUses: number): string {
  return `${order.join(",")}|${portalUses}`;
}

function swapConnection(
  order: readonly number[],
  connection: LadderConnection,
): number[] {
  const next = order.slice();
  [next[connection.fromColumn], next[connection.toColumn]] = [
    next[connection.toColumn],
    next[connection.fromColumn],
  ];
  return next;
}

/**
 * Find a short connection sequence that realizes the already-frozen uniform
 * bottom order and uses the requested number of edge portals.
 *
 * With at most six players there are only 720 permutations, so a breadth-first
 * search is small, deterministic, and easier to audit than special-case swap
 * algebra. The portal changes the visible topology, never the chosen result.
 */
function connectionsForBottomOrder(
  bottomTokens: readonly number[],
  rng: () => number,
  portalCount: number,
): LadderConnection[] {
  const playerCount = bottomTokens.length;
  const connections: LadderConnection[] = [
    ...Array.from({ length: playerCount - 1 }, (_, index) => ({
      kind: "bridge" as const,
      fromColumn: index,
      toColumn: index + 1,
    })),
    {
      kind: "portal",
      fromColumn: playerCount - 1,
      toColumn: 0,
    },
  ];

  const offset = randInt(rng, connections.length);
  const orderedConnections = connections.map(
    (_, index) => connections[(index + offset) % connections.length],
  );
  if (rng() < 0.5) orderedConnections.reverse();

  const startOrder = Array.from(
    { length: playerCount },
    (_, index) => index,
  );
  const startKey = connectionKey(startOrder, 0);
  const targetKey = connectionKey(bottomTokens, portalCount);
  const queue: Array<{ order: number[]; portalUses: number }> = [
    { order: startOrder, portalUses: 0 },
  ];
  const previous = new Map<
    string,
    { key: string; connection: LadderConnection } | null
  >([[startKey, null]]);

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const state = queue[cursor];
    const stateKey = connectionKey(state.order, state.portalUses);
    if (stateKey === targetKey) break;

    for (const connection of orderedConnections) {
      const portalUses =
        state.portalUses + (connection.kind === "portal" ? 1 : 0);
      if (portalUses > portalCount) continue;
      const nextOrder = swapConnection(state.order, connection);
      const nextKey = connectionKey(nextOrder, portalUses);
      if (previous.has(nextKey)) continue;
      previous.set(nextKey, { key: stateKey, connection });
      queue.push({ order: nextOrder, portalUses });
    }
  }

  if (!previous.has(targetKey)) {
    throw new Error("Unable to synthesize a cyclic ladder permutation.");
  }

  const result: LadderConnection[] = [];
  let currentKey = targetKey;
  while (currentKey !== startKey) {
    const step = previous.get(currentKey);
    if (!step) break;
    result.push(step.connection);
    currentKey = step.key;
  }
  return result.reverse();
}

/** Insert cancelling connection-pairs for a fuller board without result bias. */
function addNeutralConnections(
  required: readonly LadderConnection[],
  targetCount: number,
  playerCount: number,
  rng: () => number,
): LadderConnection[] {
  const allConnections: LadderConnection[] = [
    ...Array.from({ length: playerCount - 1 }, (_, index) => ({
      kind: "bridge" as const,
      fromColumn: index,
      toColumn: index + 1,
    })),
  ];
  const result = required.slice();
  while (result.length < targetCount) {
    const connection = allConnections[randInt(rng, allConnections.length)];
    const insertionIndex = randInt(rng, result.length + 1);
    result.splice(insertionIndex, 0, connection, connection);
  }
  return result;
}

export function traceLadderColumn(
  startColumn: number,
  rungs: readonly Pick<LadderRung, "fromColumn" | "toColumn">[],
): number {
  let column = startColumn;
  for (const rung of rungs) {
    if (column === rung.fromColumn) column = rung.toColumn;
    else if (column === rung.toColumn) column = rung.fromColumn;
  }
  return column;
}

export function buildLadderPath(
  startColumn: number,
  rungs: readonly LadderRung[],
): LadderPathPoint[] {
  let column = startColumn;
  const path: LadderPathPoint[] = [{ column, progress: 0 }];

  for (const rung of rungs) {
    if (column !== rung.fromColumn && column !== rung.toColumn) continue;
    path.push({ column, progress: rung.progress });
    column =
      column === rung.fromColumn ? rung.toColumn : rung.fromColumn;
    path.push({ column, progress: rung.progress, via: rung.kind });
  }

  path.push({ column, progress: 1 });
  return path;
}

/**
 * Generate a fair, shareable ladder round.
 *
 * Fairness comes from choosing a uniform shuffled bottom order first. The
 * visible ladder is then synthesized as adjacent swaps that realize that
 * exact order. Extra cancelling swap-pairs keep even identity/low-inversion
 * results visually interesting without changing the outcome.
 */
export function createLadderRound({
  players: rawPlayers,
  outcomes: rawOutcomes,
  seed,
}: LadderInput): LadderRound {
  const players = cleanLadderLabels(rawPlayers);
  const outcomes = cleanLadderLabels(rawOutcomes);
  if (!isValidLadderSetup(players, outcomes)) {
    throw new RangeError("A ladder requires 2–6 non-empty players and outcomes.");
  }

  const playerCount = players.length;
  const rng = makeRng(seed);

  // bottomTokens[column] = the player token that must finish at this column.
  const bottomTokens = shuffle(
    Array.from({ length: playerCount }, (_, index) => index),
    rng,
  );
  // More players get more paired edge gates. The exact gate rows remain
  // seeded-random, while the destination permutation is frozen first.
  const minPortalCount = playerCount <= 2 ? 1 : playerCount <= 4 ? 1 : 2;
  const maxPortalCount = Math.min(3, playerCount - 1);
  const portalCount =
    minPortalCount + randInt(rng, maxPortalCount - minPortalCount + 1);
  const requiredConnections = connectionsForBottomOrder(
    bottomTokens,
    rng,
    portalCount,
  );

  // A two-column board turns every bridge into the same full-width bar, so a
  // dense 10-row target reads like a fence. Keep that special case to 5–6
  // authored beats; larger fields retain the fuller 10–16-row rhythm. Paired
  // identical connections are still an identity operation and never change
  // the frozen assignment.
  const visualTarget =
    playerCount === 2 ? 5 + randInt(rng, 2) : 8 + playerCount + randInt(rng, 3);
  const connections = addNeutralConnections(
    requiredConnections,
    visualTarget,
    playerCount,
    rng,
  );

  const rungs: LadderRung[] = connections.map((connection, row) => ({
    id: `${row}-${connection.kind}-${connection.fromColumn}-${connection.toColumn}`,
    row,
    ...connection,
    progress: (row + 1) / (connections.length + 1),
  }));

  const permutation = Array.from({ length: playerCount }, (_, playerIndex) =>
    traceLadderColumn(playerIndex, rungs),
  );
  const assignments = players.map((player, playerIndex) => {
    const outcomeIndex = permutation[playerIndex];
    return {
      playerIndex,
      outcomeIndex,
      player,
      outcome: outcomes[outcomeIndex],
      path: buildLadderPath(playerIndex, rungs),
    } satisfies LadderAssignment;
  });

  return {
    players,
    outcomes,
    seed: seed >>> 0,
    rungs,
    permutation,
    assignments,
  };
}
