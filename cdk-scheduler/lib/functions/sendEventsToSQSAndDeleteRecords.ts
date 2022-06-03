import {
  BatchWriteItemCommandOutput,
  DynamoDB,
} from '@aws-sdk/client-dynamodb';
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
      (successfulMessage: { Id: string }) => successfulMessage.Id,
    );

    const paginatedRecords: SchedulerDynamoDBRecord[][] = [[]];
    records
      .filter(record => successfulIds.includes(extractIdForSQS(record)))
      .forEach(record => {
        if (paginatedRecords[paginatedRecords.length - 1].length >= 25)
          paginatedRecords.push([record]);
        else paginatedRecords[paginatedRecords.length - 1].push(record);
      });
    const paginatedResults = (
      await Promise.all(
        paginatedRecords.map(records_subarray =>
          dynamodb
            .batchWriteItem({
              RequestItems: {
                [tableName]: records_subarray.map(record => {
                  return {
                    DeleteRequest: {
                      Key: { pk: record.pk, sk: record.sk },
                    },
                  };
                }),
              },
            })
            .catch(() => null),
        ),
      )
    ).filter(e => e !== null) as BatchWriteItemCommandOutput[];

    type recordKey = {
      pk: { S: string };
      sk: { S: string };
    };

    const paginatedFailedKeys = paginatedResults.map(result => {
      if (result.UnprocessedItems?.[tableName] === undefined) return [];
      else
        return result.UnprocessedItems[tableName]
          .filter(request => request.DeleteRequest?.Key !== undefined)
          .map(request => request.DeleteRequest?.Key as unknown as recordKey);
    });

    let failedKeys: recordKey[] = [];
    failedKeys = failedKeys.concat(...paginatedFailedKeys);

    const successKeys = records.filter(
      record =>
        !failedKeys.some(
          element =>
            element.pk.S === record.pk.S && element.sk.S === record.sk.S,
        ),
    );

    failedIds.push(...failedMessages.map(({ Id }) => Id));
    successIdsWithFailedDeletion.push(
      ...failedKeys.map(key => `DELETION_FAILURE-${key.sk.S}`),
    );
    successfulIdsWithSuccessfulDeletion.push(
      ...successKeys.map(key => `DELETION_SUCCESS-${key.sk.S}`),
    );
  }

  return {
    failedIds,
    successIdsWithFailedDeletion,
    successfulIdsWithSuccessfulDeletion,
  };
};
