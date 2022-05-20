const dateToTimeString = (date: Date) =>
  `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`;

export const handler = (event: any) => {
  if (!event?.Records?.length)
    console.error("The event had no (or empty) `Records` array");
  event.Records.forEach((record: any) => {
    try {
      // Parse the event data
      const body = JSON.parse(record?.body);
      console.info(
        `The following event should have been dispatched at ${dateToTimeString(
          new Date(parseInt(body.publicationTimestamp))
        )} and it is currently ${dateToTimeString(new Date())}`
      );
      console.info(`Data associated with event : `, body?.payload);
    } catch (error) {
      console.error("The event record could not be parsed correctly");
      console.error("The full recieved event record is : ", record);
    }
  });
};
