import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault('GMT');

const DATE_FORMAT = 'YYYY-MM-DD';
const PUBLISH_WINDOW_MINUTES = 15;

const getPKs = now => {
  const endWindow = now
    .clone()
    .minute(now.utc().minute() + PUBLISH_WINDOW_MINUTES);

  if (now.utc().day() === endWindow.utc().day()) {
    return [now.utc().format(DATE_FORMAT)];
  }

  return [now.utc().format(DATE_FORMAT), endWindow.utc().format(DATE_FORMAT)];
};

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

    return publishDate.diff(now, 'second');
  } catch (e) {
    throw new Error('Delay could not be parsed');
  }
};

const extractId = event => {
  try {
    return event.sk.S.split('#')[1];
  } catch (e) {
    console.log(e);
    throw new Error(e, 'Could not parse id');
  }
};

const buildSk = (delay, id) => `${delay}#${id}`;

module.exports = { extractDelay, extractId, buildSk, getPKs };
