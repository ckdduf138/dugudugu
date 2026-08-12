export interface UniformityReport {
  total: number;
  expectedPerBucket: number;
  chiSquare: number;
  maxZScore: number;
  totalVariationDistance: number;
}

/**
 * Measure how far observed bucket counts are from a discrete uniform
 * distribution. The helper is intentionally pure so every seeded game can
 * share the same auditable statistical criteria.
 */
export function uniformityReport(
  observed: readonly number[],
): UniformityReport {
  if (observed.length < 2) {
    throw new RangeError("Uniformity needs at least two buckets.");
  }
  if (
    observed.some(
      (count) => !Number.isSafeInteger(count) || count < 0,
    )
  ) {
    throw new RangeError("Uniformity counts must be non-negative integers.");
  }

  const total = observed.reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    throw new RangeError("Uniformity needs at least one observation.");
  }

  const bucketCount = observed.length;
  const expectedPerBucket = total / bucketCount;
  const bucketVariance = expectedPerBucket * (1 - 1 / bucketCount);
  let chiSquare = 0;
  let maxZScore = 0;
  let totalVariationDistance = 0;

  for (const count of observed) {
    const difference = count - expectedPerBucket;
    chiSquare += (difference * difference) / expectedPerBucket;
    maxZScore = Math.max(
      maxZScore,
      Math.abs(difference) / Math.sqrt(bucketVariance),
    );
    totalVariationDistance += Math.abs(count / total - 1 / bucketCount);
  }

  return {
    total,
    expectedPerBucket,
    chiSquare,
    maxZScore,
    totalVariationDistance: totalVariationDistance / 2,
  };
}

/**
 * Conservative upper bound for a chi-square random variable.
 *
 * This is the Laurent–Massart tail bound with x = log(1 / alpha). A correct
 * uniform generator exceeds it with probability at most `falsePositiveRate`.
 * Fixed seed ranges make the repository tests deterministic rather than flaky.
 */
export function chiSquareUpperBound(
  bucketCount: number,
  falsePositiveRate = 1e-6,
): number {
  if (!Number.isSafeInteger(bucketCount) || bucketCount < 2) {
    throw new RangeError("Chi-square needs at least two buckets.");
  }
  if (!(falsePositiveRate > 0 && falsePositiveRate < 1)) {
    throw new RangeError("False-positive rate must be between zero and one.");
  }

  const degreesOfFreedom = bucketCount - 1;
  const x = Math.log(1 / falsePositiveRate);
  return (
    degreesOfFreedom +
    2 * Math.sqrt(degreesOfFreedom * x) +
    2 * x
  );
}
