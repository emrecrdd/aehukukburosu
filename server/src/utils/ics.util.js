// ======================================================
// ICS / ICALENDAR UTILITIES
// ======================================================

const DEFAULT_CALENDAR_NAME =
  'Derkenar';

const DEFAULT_PROD_ID =
  '-//Derkenar//Hukuk Büro Yönetimi//TR';

// ======================================================
// TEXT HELPERS
// ======================================================

const escapeIcsText = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(
    value
  )
    .replace(
      /\\/g,
      '\\\\'
    )
    .replace(
      /\r?\n/g,
      '\\n'
    )
    .replace(
      /;/g,
      '\\;'
    )
    .replace(
      /,/g,
      '\\,'
    );
};

// ======================================================
// DATE HELPERS
// ======================================================

const isDateOnly = (
  value
) => {
  return (
    typeof value ===
      'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  );
};

const formatDateOnly = (
  value
) => {
  if (
    isDateOnly(
      value
    )
  ) {
    return value.replace(
      /-/g,
      ''
    );
  }

  const date =
    value instanceof Date
      ? value
      : new Date(
          value
        );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      'Geçersiz takvim tarihi'
    );
  }

  const year =
    String(
      date.getUTCFullYear()
    );

  const month =
    String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getUTCDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}${month}${day}`;
};

const formatUtcDateTime = (
  value
) => {
  const date =
    value instanceof Date
      ? value
      : new Date(
          value
        );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      'Geçersiz takvim tarih/saat bilgisi'
    );
  }

  return date
    .toISOString()
    .replace(
      /[-:]/g,
      ''
    )
    .replace(
      /\.\d{3}Z$/,
      'Z'
    );
};

const addOneDayToDateOnly = (
  value
) => {
  if (
    !isDateOnly(
      value
    )
  ) {
    throw new Error(
      'Tarih YYYY-MM-DD formatında olmalıdır'
    );
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .split('-')
      .map(
        Number
      );

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  date.setUTCDate(
    date.getUTCDate() +
      1
  );

  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      '0'
    ),
    String(
      date.getUTCDate()
    ).padStart(
      2,
      '0'
    ),
  ].join('-');
};

// ======================================================
// UID
// ======================================================

const createUid = ({
  entityType,
  entityId,
}) => {
  const safeType =
    String(
      entityType ||
        'event'
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]/g,
        '-'
      );

  const safeId =
    String(
      entityId ||
        Date.now()
    )
      .trim()
      .replace(
        /[^a-zA-Z0-9_-]/g,
        '-'
      );

  return `${safeType}-${safeId}@derkenar`;
};

// ======================================================
// ICS EVENT GENERATOR
// ======================================================

export const createIcsEvent = ({
  entityType = 'event',
  entityId,

  title,
  description = '',
  location = '',

  start,
  end = null,

  allDay = false,

  url = '',
  calendarName =
    DEFAULT_CALENDAR_NAME,

  status = 'CONFIRMED',
}) => {
  if (!title) {
    throw new Error(
      'Takvim başlığı gereklidir'
    );
  }

  if (!start) {
    throw new Error(
      'Takvim başlangıç tarihi gereklidir'
    );
  }

  const uid =
    createUid({
      entityType,
      entityId,
    });

  const now =
    formatUtcDateTime(
      new Date()
    );

  const lines = [
    'BEGIN:VCALENDAR',

    'VERSION:2.0',

    `PRODID:${DEFAULT_PROD_ID}`,

    'CALSCALE:GREGORIAN',

    'METHOD:PUBLISH',

    `X-WR-CALNAME:${escapeIcsText(
      calendarName
    )}`,

    'BEGIN:VEVENT',

    `UID:${uid}`,

    `DTSTAMP:${now}`,

    `SUMMARY:${escapeIcsText(
      title
    )}`,
  ];

  // ====================================================
  // DATE / TIME
  // ====================================================

  if (allDay) {
    const startDate =
      isDateOnly(
        start
      )
        ? start
        : null;

    if (!startDate) {
      throw new Error(
        'Tam gün etkinliklerde başlangıç tarihi YYYY-MM-DD olmalıdır'
      );
    }

    const endDate =
      end &&
      isDateOnly(
        end
      )
        ? end
        : addOneDayToDateOnly(
            startDate
          );

    lines.push(
      `DTSTART;VALUE=DATE:${formatDateOnly(
        startDate
      )}`
    );

    /*
     * iCalendar standardında tam gün DTEND
     * bitiş gününü değil, bir sonraki sınırı ifade eder.
     */
    lines.push(
      `DTEND;VALUE=DATE:${formatDateOnly(
        endDate
      )}`
    );
  } else {
    lines.push(
      `DTSTART:${formatUtcDateTime(
        start
      )}`
    );

    if (end) {
      lines.push(
        `DTEND:${formatUtcDateTime(
          end
        )}`
      );
    }
  }

  // ====================================================
  // OPTIONAL FIELDS
  // ====================================================

  if (description) {
    lines.push(
      `DESCRIPTION:${escapeIcsText(
        description
      )}`
    );
  }

  if (location) {
    lines.push(
      `LOCATION:${escapeIcsText(
        location
      )}`
    );
  }

  if (url) {
    lines.push(
      `URL:${String(
        url
      ).trim()}`
    );
  }

  if (status) {
    lines.push(
      `STATUS:${String(
        status
      ).toUpperCase()}`
    );
  }

  lines.push(
    'TRANSP:OPAQUE'
  );

  lines.push(
    'END:VEVENT'
  );

  lines.push(
    'END:VCALENDAR'
  );

  /*
   * RFC 5545 satır sonlarında CRLF kullanır.
   */
  return `${lines.join(
    '\r\n'
  )}\r\n`;
};

// ======================================================
// FILE NAME
// ======================================================

export const createIcsFileName = (
  value = 'derkenar-takvim'
) => {
  const normalized =
    String(
      value
    )
      .trim()
      .toLocaleLowerCase(
        'tr-TR'
      )
      .replace(
        /ı/g,
        'i'
      )
      .replace(
        /ğ/g,
        'g'
      )
      .replace(
        /ü/g,
        'u'
      )
      .replace(
        /ş/g,
        's'
      )
      .replace(
        /ö/g,
        'o'
      )
      .replace(
        /ç/g,
        'c'
      )
      .replace(
        /[^a-z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        '');

  return `${
    normalized ||
    'derkenar-takvim'
  }.ics`;
};

export default {
  createIcsEvent,
  createIcsFileName,
};