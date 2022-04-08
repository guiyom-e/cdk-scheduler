import dayjs from 'dayjs';
import { extractDelay, extractId, getPKs } from '../lib/helpers';

const events = [
  {
    pk: {
      S: '2022-04-01',
    },
    sk: {
      S: '2022-04-01T14:55:00.000Z#4455fee0-ce74-4145-991a-c78c82f31730',
    },
    payload: {
      S: '2',
    },
    id: {
      S: 'toto',
    },
  },
];

const now = dayjs('2022-04-01T14:45:00.000Z');

describe('helpers', () => {
  describe('extractDelay', () => {
    it('should extract delay from event', () => {
      const delayInMinutes = extractDelay(events[0], now) / 60;

      expect(delayInMinutes).toEqual(10);
    });
  });

  describe('extractId', () => {
    it('should extract id from event', () => {
      const id = extractId(events[0]);

      expect(id).toEqual('4455fee0-ce74-4145-991a-c78c82f31730');
    });
  });

  describe('getPks', () => {
    it('should return only one pk', () => {
      const pk = getPKs(now);
      expect(pk).toHaveLength(1);
      expect(pk).toContain('2022-04-01');
    });

    it('should return two pks if delay is close to midnight', () => {
      const soonMidnight = dayjs('2022-04-01T23:57:00.000Z');
      const pks = getPKs(soonMidnight);
      expect(pks).toHaveLength(2);
      expect(pks).toContain('2022-04-01');
      expect(pks).toContain('2022-04-02');
    });
  });
});
