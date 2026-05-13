export async function ralphLoop({
  fn,
  maxIterations,
}: {
  fn: () => Promise<void | { reason: string }>;
  maxIterations: number;
}) {
  const iterationCount = 1;
  for (
    let iterationCount = 1;
    iterationCount <= maxIterations;
    iterationCount++
  ) {
    console.log(`\n=== ITERATION ${iterationCount}/${maxIterations} ===\n`);
    const result = await fn();
    console.log(
      `\n=== ITERATION RESULT: ${result?.reason || "<Nothing>"} ===\n\n\n\n`,
    );
    if (result?.reason) break;
  }
  console.log(`\nAll done. Ran ${iterationCount} iterations.`);
}
