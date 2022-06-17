const dateToTimeString = (date: Date) =>
  `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`;

export const handler = (event: { Records?: unknown[] }): void => {
  if (event.Records === undefined || event.Records.length === 0)
    return console.error('The event had no (or empty) `Records` array');
  event.Records.forEach((record: { body?: string }) => {
    try {
      // Parse the event data
      const body = JSON.parse(record.body ?? '') as {
        publicationTimestamp?: string;
        payload?: string;
      };
      console.info(
        `The following event should have been dispatched at ${dateToTimeString(
          new Date(parseInt(body.publicationTimestamp ?? `${Date.now()}`)),
        )} and it is currently ${dateToTimeString(new Date())}`,
      );
      console.info(`Data associated with event : `, body.payload);
    } catch (error) {
      console.error('The event record could not be parsed correctly');
      console.error('The full received event record is : ', record);
    }
  });
};
