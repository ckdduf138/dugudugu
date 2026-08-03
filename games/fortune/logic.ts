import { makeRng, randInt } from "@/lib/random";

export const FORTUNE_CATEGORY_IDS = [
  "luck",
  "courage",
  "relationship",
  "comfort",
] as const;
export type FortuneCategory = (typeof FORTUNE_CATEGORY_IDS)[number];
export const DEFAULT_FORTUNE_CATEGORY: FortuneCategory = "luck";
export const MAX_FORTUNE_MESSAGES = 100;
export const MAX_FORTUNE_MESSAGE_LENGTH = 96;

export type FortuneResult = {
  category: FortuneCategory;
  message: string;
  messageIndex: number;
  seed: number;
};

export function isFortuneCategory(value: string): value is FortuneCategory {
  return FORTUNE_CATEGORY_IDS.some((category) => category === value);
}

export function cleanFortuneMessages(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const messages: string[] = [];

  for (const value of raw) {
    const message = value
      .normalize("NFC")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, MAX_FORTUNE_MESSAGE_LENGTH);
    if (!message || seen.has(message)) continue;
    seen.add(message);
    messages.push(message);
    if (messages.length >= MAX_FORTUNE_MESSAGES) break;
  }

  return messages;
}

export function pickFortune({
  category,
  messages: rawMessages,
  seed,
}: {
  category: FortuneCategory;
  messages: readonly string[];
  seed: number;
}): FortuneResult {
  const messages = cleanFortuneMessages(rawMessages);
  if (messages.length === 0) {
    throw new RangeError("A fortune cookie requires at least one message.");
  }
  const messageIndex = randInt(makeRng(seed), messages.length);
  return {
    category,
    message: messages[messageIndex],
    messageIndex,
    seed: seed >>> 0,
  };
}
