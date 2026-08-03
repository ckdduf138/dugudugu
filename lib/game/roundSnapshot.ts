import { hashSeed, randomSeed } from "@/lib/random";

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export type RoundSnapshot<Game extends string, Input> = Readonly<{
  version: 1;
  game: Game;
  seed: number;
  input: DeepReadonly<Input>;
}>;

export type CreateRoundSnapshotOptions<Game extends string, Input> = {
  game: Game;
  input: Input;
  /** A string is hashed; omitted seeds use the shared cryptographic helper. */
  seed?: number | string;
};

function normalizeSeed(seed: number | string | undefined): number {
  if (seed === undefined) return randomSeed();
  if (typeof seed === "string") return hashSeed(seed);
  if (!Number.isFinite(seed)) throw new TypeError("Round seed must be finite");
  return seed >>> 0;
}

function cloneJson(value: unknown, path: string, ancestors: Set<object>): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must contain only finite numbers`);
    }
    return value;
  }

  if (typeof value !== "object") {
    throw new TypeError(`${path} must be JSON-serializable`);
  }

  if (ancestors.has(value)) {
    throw new TypeError(`${path} cannot contain a circular reference`);
  }
  ancestors.add(value);

  if (Array.isArray(value)) {
    const clone = Array.from({ length: value.length }, (_, index) => {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        throw new TypeError(`${path} cannot contain sparse array slots`);
      }
      return cloneJson(value[index], `${path}[${index}]`, ancestors);
    });
    ancestors.delete(value);
    return Object.freeze(clone);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    ancestors.delete(value);
    throw new TypeError(`${path} must contain only plain objects and arrays`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    ancestors.delete(value);
    throw new TypeError(`${path} cannot contain symbol keys`);
  }

  const clone: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    clone[key] = cloneJson(item, `${path}.${key}`, ancestors);
  }
  ancestors.delete(value);
  return Object.freeze(clone);
}

/**
 * Captures the exact setup used by a round before its cutscene starts.
 * Mutating form state afterwards cannot change the fair, shareable result.
 */
export function createRoundSnapshot<const Game extends string, Input>({
  game,
  input,
  seed,
}: CreateRoundSnapshotOptions<Game, Input>): RoundSnapshot<Game, Input> {
  if (!game.trim()) throw new TypeError("Round game id cannot be empty");

  const snapshot = {
    version: 1 as const,
    game,
    seed: normalizeSeed(seed),
    input: cloneJson(input, "Round input", new Set()) as DeepReadonly<Input>,
  };

  return Object.freeze(snapshot);
}
