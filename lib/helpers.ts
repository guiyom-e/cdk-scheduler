import { SchedulerDynamoDBRecord } from './types';

export const getNow = (): number => Date.now();

/** Returns the delay between now and the record publication timestamp, in seconds */
export const extractDelay = (
  record: Pick<SchedulerDynamoDBRecord, 'sk'>,
  now: number,
): number => {
  const sk = record.sk;

  const publishTimestamp = parseInt(sk.S.split('#')[0]);

  if (isNaN(publishTimestamp)) {
    throw new Error('Delay could not be parse');
  }

  return Math.max(0, Math.floor((publishTimestamp - now) / 1000));
};

export const extractId = (record: SchedulerDynamoDBRecord): string => {
  const match = record.sk.S.match(/^\d+?#(.+)$/);
  if (match !== null && match.length >= 2) {
    return match[1];
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
