import { DynamoDBStreams } from 'aws-sdk';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { CRON_DELAY_IN_MINUTES } from '../../index';
import { extractDelaySeconds, getEnvVariable, getNow } from '../helpers';
import { sendEventsToSQSAndDeleteRecords } from '../sendEventsToSQSAndDeleteRecords';
import { SchedulerDynamoDBRecord } from '../../types';

const isValidRecord = (record: unknown): record is SchedulerDynamoDBRecord =>
  // @ts-expect-error record if of type unknown
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  record?.sk?.S !== undefined;

export const handler = async (
  event: DynamoDBStreams.Types.GetRecordsOutput,
): Promise<ReturnType<typeof sendEventsToSQSAndDeleteRecords> | undefined> => {
  const tableName = getEnvVariable('TABLE_NAME');
  const queueUrl = getEnvVariable('QUEUE_URL');

  if (event.Records === undefined) {
    return;
  }

  const dynamodb = new DynamoDB({});

  const now = getNow();
  const recordsToHandle = event.Records.filter(record =>
    ['INSERT', 'MODIFY'].includes(record.eventName ?? ''),
  )
    .map(record => record.dynamodb?.NewImage)
    .filter(
      record =>
        isValidRecord(record) &&
        extractDelaySeconds(record, now) <= (CRON_DELAY_IN_MINUTES + 1) * 60,
    ) as unknown[] as SchedulerDynamoDBRecord[];

  return await sendEventsToSQSAndDeleteRecords(
    recordsToHandle,
    {
      queueUrl,
      tableName,
      dynamodb,
    },
    'handleNearFuture',
  );
};
