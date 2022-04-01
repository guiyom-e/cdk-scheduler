import dayjs from 'dayjs';

const extractDelay = (event, now) => {
  const sk = event.sk;

  try {
    const publishDate = dayjs(sk.S.split('#')[0]);

    console.log(
      'computed publishDate',
      event.sk,
      ' --> ',
      publishDate.format(),
    );

    const delay = publishDate.diff(now, 'second');

    return delay;
  } catch (e) {
    throw 'Delay could not be parsed';
  }
};

const extractId = event => {
  try {
    return event.sk.S.split('#')[1];
  } catch (e) {
    console.log(e);
    throw (e, 'Could not parse id');
  }
};

const buildSk = (delay, id) => `${delay}#${id}`;

module.exports = { extractDelay, extractId, buildSk };
