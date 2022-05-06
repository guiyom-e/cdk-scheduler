import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { SQS } from 'aws-sdk';

import { extractDelay, extractId, getNow } from './helpers';
import { SchedulerDynamoDBRecord } from './types';

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

export const sendEventsToSQSAndDeleteRecords = async (
  records: SchedulerDynamoDBRecord[],
  { queueUrl, dynamodb, tableName }: Config,
): Promise<{
  failedIds: string[];
  successIdsWithFailedDeletion: unknown[];
  successfulIdsWithSuccessfulDeletion: unknown[];
}> => {
  const sqs = new SQS();
  const now = getNow();

  const entries = records.map(record => ({
    Id: extractId(record),
    DelaySeconds: extractDelay(record, now),
    MessageBody: JSON.stringify({
      publicationTimestamp: record.sk.S.split('#')[0],
      payload: record.payload,
    }),
  }));

  const failedIds: string[] = [];
  const successIdsWithFailedDeletion: unknown[] = [];
  const successfulIdsWithSuccessfulDeletion: unknown[] = [];

  for (let i = 0; i < entries.length; i += SQS_BATCH_SIZE) {
    const { Successful: successfulMessages, Failed: failedMessages } = await sqs
      .sendMessageBatch({
        Entries: entries.slice(i, Math.min(i + SQS_BATCH_SIZE, entries.length)),
        QueueUrl: queueUrl,
      })
      .promise();

    const successfulIds = successfulMessages.map(
      successfulMessage => successfulMessage.Id,
    );
    const deletions = await Promise.allSettled(
      records
        .filter(record => successfulIds.includes(extractId(record)))
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
