import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';

import 'dayjs/locale/tr';

import {
  APP_TIMEZONE,
  DATE_FORMATS,
} from '../app/config/constants.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

dayjs.locale('tr');

// ======================================================
// INTERNAL
// ======================================================

const parseDate = (date) => {
  if (!date) {
    return null;
  }

  const parsed = dayjs(date);

  if (!parsed.isValid()) {
    return null;
  }

  return parsed.tz(APP_TIMEZONE);
};

// ======================================================
// FORMAT
// ======================================================

export const formatDate = (
  date,
  format = DATE_FORMATS.DISPLAY
) => {
  const parsed = parseDate(date);

  if (!parsed) {
    return '-';
  }

  return parsed.format(format);
};

export const formatDateTime = (
  date,
  format = DATE_FORMATS.DISPLAY_WITH_TIME
) => {
  const parsed = parseDate(date);

  if (!parsed) {
    return '-';
  }

  return parsed.format(format);
};

export const formatTime = (
  date,
  format = DATE_FORMATS.TIME
) => {
  const parsed = parseDate(date);

  if (!parsed) {
    return '-';
  }

  return parsed.format(format);
};

// ======================================================
// RELATIVE TIME
// ======================================================

export const formatRelativeTime = (
  date
) => {
  const parsed = parseDate(date);

  if (!parsed) {
    return '-';
  }

  const now =
    dayjs().tz(APP_TIMEZONE);

  const diffMinutes =
    now.diff(parsed, 'minute');

  if (diffMinutes < 0) {
    return parsed.from(now);
  }

  if (diffMinutes < 1) {
    return 'Az önce';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} dakika önce`;
  }

  if (diffMinutes < 1440) {
    return `${Math.floor(
      diffMinutes / 60
    )} saat önce`;
  }

  if (diffMinutes < 4320) {
    return `${Math.floor(
      diffMinutes / 1440
    )} gün önce`;
  }

  return formatDate(date);
};

// ======================================================
// DATE CHECKS
// ======================================================

export const isToday = (
  date
) => {
  const parsed =
    parseDate(date);

  if (!parsed) {
    return false;
  }

  return parsed.isSame(
    dayjs().tz(APP_TIMEZONE),
    'day'
  );
};

export const isTomorrow = (
  date
) => {
  const parsed =
    parseDate(date);

  if (!parsed) {
    return false;
  }

  return parsed.isSame(
    dayjs()
      .tz(APP_TIMEZONE)
      .add(1, 'day'),
    'day'
  );
};

// ======================================================
// OVERDUE
// ======================================================

export const isOverdue = (
  date,
  compareTime = true
) => {
  const parsed =
    parseDate(date);

  if (!parsed) {
    return false;
  }

  const now =
    dayjs().tz(APP_TIMEZONE);

  return compareTime
    ? parsed.isBefore(now)
    : parsed.isBefore(
        now,
        'day'
      );
};