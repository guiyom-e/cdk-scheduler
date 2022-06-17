import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { SQS } from 'aws-sdk';

import {
  extractDelaySeconds,
  extractIdForSQS,
  extractTimestamp,
  getNow,
} from './helpers';
import { SchedulerDynamoDBRecord } from '../types';

const SQS_BATCH_SIZE = 10;

interface Config {
  queueUrl: string;
  dynamodb: DynamoDB;
  tableName: string;
}

const isPromiseFulfilled = <T>(
  settledPromise: PromiseSettledResult<T>,
): settledPromise is PromiseFulfilledResult<T> =>
  settledPromise.status === 'fulfilled';

const isPromiseRejected = <T>(
  settledPromise: PromiseSettledResult<T>,
): settledPromise is PromiseRejectedResult =>
  settledPromise.status === 'rejected';

const createSQSMessageFromRecord = (
  record: SchedulerDynamoDBRecord,
  source: string | undefined,
) => {
  const now = getNow();
  const delaySeconds = extractDelaySeconds(record, now);

  return {
    Id: extractIdForSQS(record),
    DelaySeconds: delaySeconds,
    MessageBody: JSON.stringify({
      publicationTimestamp: extractTimestamp(record),
      payload: record.payload,
      _source: source ?? 'unknown',
      _sentTimeStamp: now,
      _delaySeconds: delaySeconds,
    }),
  };
};

export const sendEventsToSQSAndDeleteRecords = async (
  records: SchedulerDynamoDBRecord[],
  { queueUrl, dynamodb, tableName }: Config,
  source?: string,
): Promise<{
  failedIds: string[];
  successIdsWithFailedDeletion: unknown[];
  successfulIdsWithSuccessfulDeletion: unknown[];
}> => {
  const sqs = new SQS();

  const failedIds: string[] = [];
  const successIdsWithFailedDeletion: unknown[] = [];
  const successfulIdsWithSuccessfulDeletion: unknown[] = [];

  for (let i = 0; i < records.length; i += SQS_BATCH_SIZE) {
    const { Successful: successfulMessages, Failed: failedMessages } = await sqs
      .sendMessageBatch({
        Entries: records
          .slice(i, Math.min(i + SQS_BATCH_SIZE, records.length))
          .map(record => createSQSMessageFromRecord(record, source)),
        QueueUrl: queueUrl,
      })
      .promise();

    const successfulIds = successfulMessages.map(
      successfulMessage => successfulMessage.Id,
    );
    const deletions = await Promise.allSettled(
      records
        .filter(record => successfulIds.includes(extractIdForSQS(record)))
        .map(record =>
          dynamodb.deleteItem({
            TableName: tableName,
            Key: { pk: record.pk, sk: record.sk },
          }),
        ),
    );

    failedIds.push(...failedMessages.map(({ Id }) => Id));
    successIdsWithFailedDeletion.push(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return
      ...deletions.filter(isPromiseRejected).map(deletion => deletion.reason),
    );
    successfulIdsWithSuccessfulDeletion.push(
      ...deletions.filter(isPromiseFulfilled).map(deletion => deletion.value),
    );
  }

  return {
    failedIds,
    successIdsWithFailedDeletion,
    successfulIdsWithSuccessfulDeletion,
  };
};
