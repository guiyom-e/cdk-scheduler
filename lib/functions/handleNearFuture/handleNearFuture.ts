import { DynamoDBStreams } from 'aws-sdk';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { CRON_DELAY_IN_MINUTES } from 'lib/index';
import { extractDelay, getNow } from 'lib/helpers';
import { sendEventsToSQSAndDeleteRecords } from 'lib/sendEventsToSQSAndDeleteRecords';
import { SchedulerDynamoDBRecord } from 'lib/types';

const isValidRecord = (record: unknown): record is SchedulerDynamoDBRecord =>
  // @ts-expect-error record if of type unknw
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  record?.sk?.S !== undefined;

export const handler = async (
  event: DynamoDBStreams.Types.GetRecordsOutput,
): Promise<ReturnType<typeof sendEventsToSQSAndDeleteRecords> | undefined> => {
  if (event.Records === undefined) {
    return;
  }

  const dynamodb = new DynamoDB({});

  const now = getNow();
  const recordsToHandle = event.Records.map(
    record => record.dynamodb?.NewImage,
  ).filter(
    record =>
      isValidRecord(record) &&
      extractDelay(record, now) <= CRON_DELAY_IN_MINUTES + 1,
  ) as unknown[] as SchedulerDynamoDBRecord[];

  return await sendEventsToSQSAndDeleteRecords(recordsToHandle, {
    queueUrl: process.env.QUEUE_URL ?? 'INVALID_QUEUE_URL',
    tableName: process.env.TABLE_NAME ?? 'INVALID_TABLE_NAME',
    dynamodb,
  });
};
