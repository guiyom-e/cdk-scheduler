import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { SQS } from 'aws-sdk';
import dayjs from 'dayjs';

import { extractDelay, extractId } from './helpers';

const DATE_FORMAT = 'YYYY-MM-DD';
const CRON_DELAY_IN_MINUTES = 14;

export const handler = async ({ tableName, queueUrl }) => {
  console.log('Input event', { tableName, queueUrl });

  // Query dynamo
  const dynamodb = new DynamoDB();
  const now = dayjs();

  const { Items: events } = await dynamodb.query({
    ExpressionAttributeValues: {
      ':v1': {
        S: now.format(DATE_FORMAT),
      },
      ':now': {
        S: now.toISOString(),
      },
      ':future': {
        S: now.add(CRON_DELAY_IN_MINUTES + 1, 'minute').toISOString(),
      },
    },
    KeyConditionExpression: 'pk = :v1 AND ( sk BETWEEN :now AND :future )',
    TableName: tableName,
  });

  console.log('events fetched', events);

  // SQS
  const sqs = new SQS();

  console.log('sending to sqs');

  const entries = events.map(newEvent => ({
    Id: extractId(newEvent),
    DelaySeconds: extractDelay(newEvent, now),
    MessageBody: JSON.stringify({
      id: newEvent.id.S,
      payload: newEvent.payload.S,
    }),
  }));

  console.log({ events: entries });

  for (let i = 0; i < entries.length; i += 10) {
    const { Successful: successfulMessages, Failed: failedMessages } = await sqs
      .sendMessageBatch({
        Entries: entries.slice(i, Math.min(i + 10, entries.length)),
        QueueUrl: queueUrl,
      })
      .promise();

    console.info(
      'Successfully added batch of events:',
      successfulMessages,
      'Failed events:',
      failedMessages,
    );
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
    console.log('Deletions:', deletions);
  }
};
