// Avoid queuing thousands of transactions behind pg's bounded connection pool.
export const forEachSeedBatch = async <T>(
  records: T[],
  callback: (record: T, index: number) => Promise<unknown>,
) => {
  const batchSize = 5;
  const batches = Array.from({ length: Math.ceil(records.length / batchSize) }, (_, index) => ({
    offset: index * batchSize,
    records: records.slice(index * batchSize, (index + 1) * batchSize),
  }));

  await batches.reduce(async (previous, batch) => {
    await previous;
    await Promise.all(batch.records.map((record, index) => callback(record, batch.offset + index)));
  }, Promise.resolve());
};
