const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const tableName = process.env.TABLE_NAME;
const partitionKeyValue = process.env.PARTITION_KEY_VALUE || 'scheduler';
const beforeTimestampMs =
  process.env.BEFORE_TIMESTAMP_MS === undefined
    ? Date.now()
    : Number(process.env.BEFORE_TIMESTAMP_MS);
const dryRun = process.env.DRY_RUN === 'true';

if (!tableName) {
  throw new Error('TABLE_NAME is required (name of the scheduler table).');
}

if (Number.isNaN(beforeTimestampMs) || beforeTimestampMs <= 0) {
  throw new Error(
    'BEFORE_TIMESTAMP_MS must be a positive Unix timestamp in milliseconds.',
  );
}

const dynamodb = new DynamoDB({});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const chunk = (items, size) => {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

const deleteWithRetry = async (keys, maxAttempts = 3) => {
  let pending = keys;
  for (let attempt = 1; attempt <= maxAttempts && pending.length > 0; attempt++) {
    const response = await dynamodb.batchWriteItem({
      RequestItems: {
        [tableName]: pending.map(key => ({
          DeleteRequest: { Key: key },
        })),
      },
    });

    const unprocessed =
      response.UnprocessedItems?.[tableName]
        ?.map(request => request.DeleteRequest?.Key)
        ?.filter(Boolean) || [];

    pending = unprocessed;

    if (pending.length > 0) {
      await sleep(200 * attempt);
    }
  }

  return pending;
};

const purge = async () => {
  let lastEvaluatedKey = undefined;
  let scanned = 0;
  let deleted = 0;
  const failedKeys = [];

  do {
    const { Items, LastEvaluatedKey } = await dynamodb.query({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND sk < :before',
      ExpressionAttributeValues: {
        ':pk': { S: partitionKeyValue },
        ':before': { S: beforeTimestampMs.toString() },
      },
      ProjectionExpression: 'pk, sk',
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const records = Items || [];
    scanned += records.length;

    if (dryRun) {
      console.log(
        `DRY_RUN: would delete ${records.length} items from page (pk=${partitionKeyValue}, sk<${beforeTimestampMs}).`,
      );
    } else if (records.length > 0) {
      for (const batch of chunk(records, 25)) {
        const remaining = await deleteWithRetry(batch);
        deleted += batch.length - remaining.length;
        failedKeys.push(...remaining);
      }
    }

    lastEvaluatedKey = LastEvaluatedKey;
  } while (lastEvaluatedKey !== undefined);

  if (dryRun) {
    console.log(`DRY_RUN complete. Scanned ${scanned} items.`);
  } else {
    console.log(
      `Purge complete. Deleted ${deleted} items. Remaining failed deletes: ${failedKeys.length}.`,
    );
    if (failedKeys.length > 0) {
      console.error(
        'Failed to delete the following keys after retries:',
        failedKeys,
      );
    }
  }
};

void purge().catch(error => {
  console.error(error);
  process.exit(1);
});
