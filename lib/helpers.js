const getNow = () => Date.now();

/** Returns the delay between now and the record publication timestamp, in seconds */
const extractDelay = (record, now) => {
  const sk = record.sk;

  try {
    const publishTimestamp = parseInt(sk.S.split('#')[0]);

    return Math.max(0, Math.floor((publishTimestamp - now) / 1000));
  } catch (e) {
    throw new Error('Delay could not be parsed', e);
  }
};

const extractId = record => {
  try {
    return record.sk.S.split('#')[1];
  } catch (e) {
    throw new Error('Could not parse id', e);
  }
};

const buildSk = (delay, id) => `${delay}#${id}`;

const getExpressionAttributeValues = (now, cronDelay) => ({
  ':now': {
    S: now.toString(),
  },
  ':future': {
    S: (now + (cronDelay + 1) * 60 * 1000).toString(),
  },
});

module.exports = {
  extractDelay,
  extractId,
  getNow,
  buildSk,
  getExpressionAttributeValues,
};
