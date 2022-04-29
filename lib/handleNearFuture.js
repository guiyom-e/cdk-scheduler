import { CRON_DELAY_IN_MINUTES } from './index';
import { extractDelay, getNow } from './helpers';
import { sendEventsToSQSAndDeleteRecords } from './sendEventsToSQSAndDeleteRecords';

export const handler = async event => {
  const now = getNow();
  const recordsToHandle = event.Records.map(
    ({ dynamodb: { NewImage: record } }) => record,
  ).filter(record => extractDelay(record, now) <= CRON_DELAY_IN_MINUTES + 1);

  return await sendEventsToSQSAndDeleteRecords(recordsToHandle, {});
};
