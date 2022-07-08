export const handler = (event: { Records?: unknown[] }): void => {
  if (event.Records === undefined || event.Records.length === 0)
    return console.error('The event had no (or empty) `Records` array');
  event.Records.forEach((record: { Id?: string; body?: string }) => {
    const body = JSON.parse(record.body ?? '') as {
      publicationTimestamp?: string;
      payload?: {
        M?: {
          TestId?: { S?: string };
          UniqueId?: { S?: string };
        };
      };
      _source?: string;
      _sentTimeStamp?: number;
      _delaySeconds?: number;
    };
    const publicationTimestamp = new Date(
      parseInt(body.publicationTimestamp ?? 'NaN'),
    );

    const now = new Date(Date.now());

    console.info(
      `[FOR_DASHBOARD] ` +
        `/ Id: ${body.payload?.M?.TestId?.S ?? 'unknown'} ` +
        `/ UniqueId: ${body.payload?.M?.UniqueId?.S ?? 'unknown'} ` +
        `/ PublicationTimestamp: ${publicationTimestamp.toISOString()} ` +
        `/ Now: ${now.toISOString()}  ` +
        `/ DiffMs: ${now.valueOf() - publicationTimestamp.valueOf()} ` +
        `/ Source: ${body._source ?? 'unknown'} ` +
        `/ SentTimeStamp: ${body._sentTimeStamp ?? 'unknown'} ` +
        `/ DelaySeconds: ${body._delaySeconds ?? 'unknown'}`,
      record,
      body.payload,
    );
  });
};
