import { DynamoDB } from '@aws-sdk/client-dynamodb';

import { getExpressionAttributeValues, getNow } from '../helpers';
import { sendEventsToSQSAndDeleteRecords } from '../sendEventsToSQSAndDeleteRecords';
import { SchedulerDynamoDBRecord } from '../../types';

interface HandlerConfig {
  tableName: string;
  queueUrl: string;
  cronDelayInMinutes: number;
  partitionKeyValue: string;
}

export const handler = async ({
  tableName,
  queueUrl,
  cronDelayInMinutes,
  partitionKeyValue,
}: HandlerConfig): Promise<
  ReturnType<typeof sendEventsToSQSAndDeleteRecords>
> => {
  if (cronDelayInMinutes <= 0 || cronDelayInMinutes > 14) {
    throw new Error(
      'Invalid configuration: cronDelayInMinutes must be an integer between 1 and 14 minutes.',
    );
  }

  // Query the SchedulerTable to get the upcoming events.
  const dynamodb = new DynamoDB({});
  const now = getNow();

  const { Items: records } = await dynamodb.query({
    ExpressionAttributeValues: {
      ':pk': { S: partitionKeyValue },
      ...getExpressionAttributeValues(now, cronDelayInMinutes),
    },
    KeyConditionExpression: 'pk = :pk AND ( sk BETWEEN :now AND :future )',
    TableName: tableName,
  });

  // Send upcoming events to the scheduling queue.
  return await sendEventsToSQSAndDeleteRecords(
    records as unknown as SchedulerDynamoDBRecord[],
    {
      queueUrl,
      dynamodb,
      tableName,
    },
  );
};
