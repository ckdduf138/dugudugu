# Randomness and fairness

Dugudugu separates **choosing a result** from **showing the cutscene**. A new
round first obtains a 32-bit seed from `crypto.getRandomValues` when available
(with a full-range `Math.random` fallback), freezes the complete result with
the seeded `mulberry32` generator, and only then starts animation. Frame rate,
physics, skipping, and rendering cannot change it.

Run the reproducible audit with:

```bash
pnpm test:fairness
```

The audit uses fixed seed ranges, so it never fails merely because a test run
was unlucky. It checks discrete uniformity with a conservative chi-square tail
bound (false-positive probability at most `1e-6`), maximum bucket z-score, and
total variation distance where useful.

## Game contracts

- **Draw:** Fisher–Yates samples entries without replacement. For `n`
  candidates and `k` winners, every entry has inclusion probability `k / n`,
  and every unordered `k`-entry combination has probability `1 / C(n, k)`.
  Duplicate labels are separate physical entries/tickets because entry IDs,
  rather than display text, are shuffled.
- **Ladder:** a uniform destination permutation is frozen first. The visible
  bridges and edge portals are synthesized afterward to realize exactly that
  permutation. Portals therefore make the route topology more varied, but are
  neither more nor less fair than the portal-free shuffled assignment. Tests
  compare the frozen shuffle and every traced final route exactly, then audit
  the destination distribution conditional on portal count.
- **Race:** the entire finish order is one uniform shuffle. Seeded progress
  curves dramatize that immutable order and cannot replace it.
- **Fortune:** the selected category is user input. Within that category every
  cleaned, unique message has the same `1 / n` chance.

## Scope and limitations

These guarantees mean equal probability, no replacement where promised, and
reproducibility from a seed. They do not make a fully client-side game
tamper-proof: someone who knows or changes the URL seed can predict or replay a
result, and someone can always abandon a round and start another one. A future
verifiable drawing product would need an external commitment or jointly chosen
seed; that is intentionally outside this static arcade's current scope.
