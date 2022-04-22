import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { SQS } from 'aws-sdk';

import {
  extractDelay,
  extractId,
  getExpressionAttributeValues,
  getNow,
} from './helpers';

const SQS_BATCH_SIZE = 10;

export const handler = async ({
  tableName,
  queueUrl,
  cronDelayInMinutes,
  partitionKeyValue,
}) => {
  if (cronDelayInMinutes <= 0 || cronDelayInMinutes > 14) {
    throw new Error(
      'Invalid configuration: cronDelayInMinutes must be an integer between 1 and 14 minutes.',
    );
  }

  // Query the SchedulerTable to get the upcoming events.
  const dynamodb = new DynamoDB();
  const now = getNow();

  const { Items: events } = await dynamodb.query({
    ExpressionAttributeValues: {
      ':pk': { S: partitionKeyValue },
      ...getExpressionAttributeValues(now, cronDelayInMinutes),
    },
    KeyConditionExpression: 'pk = :pk AND ( sk BETWEEN :now AND :future )',
    TableName: tableName,
  });

  // Send upcoming events to the scheduling queue.
  const sqs = new SQS();

  const entries = events.map(event => ({
    Id: extractId(event),
    DelaySeconds: extractDelay(event, now),
    MessageBody: JSON.stringify({
      publicationTimestamp: event.sk.S.split('#')[0],
      payload: event.payload.S,
    }),
  }));

  const failedIds = [];
  const successIdsWithFailedDeletion = [];
  const successfulIdsWithSuccessfulDeletion = [];

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
      events
        .filter(event => successfulIds.includes(extractId(event)))
        .map(event =>
          dynamodb.deleteItem({
            TableName: tableName,
            Key: { pk: event.pk, sk: event.sk },
          }),
        ),
    );

    failedIds.push(...failedMessages.map(({ Id }) => Id));
    successIdsWithFailedDeletion.push(
      ...deletions
        .filter(deletion => deletion.status === 'rejected')
        .map(deletion => deletion.value),
    );
    successfulIdsWithSuccessfulDeletion.push(
      ...deletions
        .filter(deletion => deletion.status === 'fulfilled')
        .map(deletion => deletion.value),
    );
  }

  return {
    failedIds,
    successIdsWithFailedDeletion,
    successfulIdsWithSuccessfulDeletion,
  };
};
