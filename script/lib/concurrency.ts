/** Runs `worker` over `items` with at most `limit` in flight at once. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index]!, index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    run()
  );
  await Promise.all(workers);
  return results;
}
