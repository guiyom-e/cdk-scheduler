import { SchedulerDynamoDBRecord } from './types';

export const getNow = (): number => Date.now();

/** Returns the delay between now and the record publication timestamp, in seconds */
export const extractDelay = (
  record: Pick<SchedulerDynamoDBRecord, 'sk'>,
  now: number,
): number => {
  const sk = record.sk;

  try {
    const publishTimestamp = parseInt(sk.S.split('#')[0]);

    return Math.max(0, Math.floor((publishTimestamp - now) / 1000));
  } catch (e) {
    throw new Error('Delay could not be parse');
  }
};

export const extractId = (record: SchedulerDynamoDBRecord): string => {
  try {
    return record.sk.S.split('#')[1];
  } catch (e) {
    throw new Error('Could not parse id');
  }
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
