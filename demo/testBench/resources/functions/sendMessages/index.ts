import { DynamoDB, WriteRequest } from '@aws-sdk/client-dynamodb';

const dynamo = new DynamoDB({
  region: process.env.SCHEDULER_REGION,
});

const skToRequest = (pk: string, sk: string, now: number, testId: string) =>
  ({
    PutRequest: {
      Item: {
        pk: { S: pk },
        sk: {
          S: sk,
        },
        payload: {
          M: {
            MessageContent: {
              S: `Sort Key: ${sk} | Now: ${now} (${new Date(
                now,
              ).toISOString()})`,
            },
            TestId: { S: testId },
            UniqueId: { S: sk },
          },
        },
      },
    },
  } as WriteRequest);

const dateToRequest = (pk: string, date: number, now: number, testId: string) =>
  skToRequest(pk, `${date}#EACH_MINUTE-${date - now}#${testId}`, now, testId);

const getRandomId = () => Math.floor(Math.random() * 1000000000).toString();

interface HandlerInput {
  eventSetIndices: number[];
}

export const handler = async ({
  eventSetIndices,
}: HandlerInput): Promise<unknown> => {
  if (
    process.env.SCHEDULER_TABLE_NAME === undefined ||
    process.env.SCHEDULER_PK === undefined
  ) {
    throw new Error('Missing environment variables!');
  }
  const schedulerTableName = process.env.SCHEDULER_TABLE_NAME;
  const partitionKey = process.env.SCHEDULER_PK;

  const now = Date.now();
  const testId = getRandomId();

  const everySecondAndMoreRequests: WriteRequest[] = [
    now,
    now + 1,
    now + 10,
    now + 100,
    now + 1000,
    now + 1001,
    now + 1010,
    now + 1100,
    now + 2000,
    now + 3000,
    now + 4000,
    now + 5000,
    now + 6000,
    now + 7000,
    now + 8000,
    now + 9000,
    now + 10000,
  ].map(delay =>
    dateToRequest(partitionKey, delay, now, testId + '#' + getRandomId()),
  );

  const everyMinuteRequests: WriteRequest[] = Array.from(
    { length: 25 },
    (_, i) => i + 1,
  )
    .map(delay => now + delay * 60 * 1000)
    .map(delay =>
      dateToRequest(partitionKey, delay, now, testId + '#' + getRandomId()),
    );

  const everyMinuteLongTermRequests: WriteRequest[] = Array.from(
    { length: 25 },
    (_, i) => i + 1,
  )
    .map(delay => now + (25 + delay) * 60 * 1000)
    .map(delay =>
      dateToRequest(partitionKey, delay, now, testId + '#' + getRandomId()),
    );

  const nearFutureBatch = Array.from({ length: 25 }, (_, i) => i)
    .map(i => `${now + 5 * 60 * 1000}#${i}#${testId}`)
    .map(sk =>
      skToRequest(partitionKey, sk, now, testId + '#' + getRandomId()),
    );

  const batchIn15Minutes = Array.from({ length: 25 }, (_, i) => i)
    .map(i => `${now + 15 * 60 * 1000}#${i}#${testId}`)
    .map(sk =>
      skToRequest(partitionKey, sk, now, testId + '#' + getRandomId()),
    );

  const eventRequests = [
    everySecondAndMoreRequests,
    everyMinuteRequests,
    everyMinuteLongTermRequests,
    nearFutureBatch,
    batchIn15Minutes,
  ].filter((_, index) => eventSetIndices.includes(index));

  const responses = await Promise.all(
    eventRequests.map(eventRequest =>
      dynamo.batchWriteItem({
        RequestItems: {
          [schedulerTableName]: eventRequest,
        },
      }),
    ),
  );

  console.info(
    'Results',
    responses,
    'Status codes: ',
    responses.map(response => response.$metadata.httpStatusCode).join(' / '),
  );

  return {
    statusCode: 200,
    body: `Completed! Test id: ${testId}`,
  };
};
