import { SchedulerDynamoDBRecord } from '../types';

export const getNow = (): number => Date.now();

type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/** Extract timestamp from record.
 *
 * The sort key must be with the format: [timestamp] or [timestamp]#[any string]
 * */
export const extractTimestamp = (
  record: PartialExcept<SchedulerDynamoDBRecord, 'sk'>,
): number => {
  const publishTimestamp = parseInt(record.sk.S.split('#')[0]);

  if (isNaN(publishTimestamp)) {
    throw new Error('Timestamp could not be parsed');
  }

  return publishTimestamp;
};

/** Returns the delay between now and the record publication timestamp, in seconds.
 *
 * NB: if the delay is negative, i.e. the record is in the past, it returns 0.
 */
export const extractDelaySeconds = (
  record: PartialExcept<SchedulerDynamoDBRecord, 'sk'>,
  now: number,
): number => {
  const publishTimestamp = extractTimestamp(record);

  return Math.max(0, Math.floor((publishTimestamp - now) / 1000));
};

/** Extract an entry id for SQS, from a record
 *
 * In SQS, a batch entry id can only contain alphanumeric characters, hyphens and underscores. It can be at most 80 letters long.
 */
export const extractIdForSQS = (
  record: PartialExcept<SchedulerDynamoDBRecord, 'sk'>,
): string => {
  const match = record.sk.S.match(/^(\d+#?[a-zA-Z0-9-_]*).*$/);
  if (match !== null && match.length >= 2) {
    return match[1].replace('#', '-').slice(0, 80);
  }
  throw new Error('Could not parse id');
};

export const buildSk = (delay: number, id: string): string => `${delay}#${id}`;

export const getExpressionAttributeValues = (
  now: number,
  cronDelay: number,
): { ':now': { S: string }; ':future': { S: string } } => ({
  ':now': {
    S: now.toString(),
  },
  ':future': {
    S: (now + (cronDelay + 1) * 60 * 1000).toString(),
  },
});

export const getEnvVariable = (name: string): string => {
  const variable = process.env[name];
  if (variable === undefined)
    throw new Error(`Environment variable not found: ${name}`);

  return variable;
};
