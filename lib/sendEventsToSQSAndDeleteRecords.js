import { SQS } from 'aws-sdk';

import { extractDelay, extractId, getNow } from './helpers';

const SQS_BATCH_SIZE = 10;

export const sendEventsToSQSAndDeleteRecords = async (
  records,
  { queueUrl, dynamodb, tableName },
) => {
  const sqs = new SQS();
  const now = getNow();

  const entries = records.map(event => ({
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
