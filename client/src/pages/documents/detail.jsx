import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  useDocument,
  useDocumentVersions,
  useUploadDocumentVersion,
} from '../../features/documents/document.query.js';

import documentApi from '../../features/documents/document.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  Download,
  Eye,
  FileClock,
  History,
  Pencil,
  UploadCloud,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.mp4',
  '.webm',
  '.udf',
];

// ======================================================
// HELPERS
// ======================================================

const getCategoryLabel = (
  category
) => {
  const labels = {
    general: 'Genel',
    petition: 'Dilekçe',
    expert_report:
      'Bilirkişi Raporu',
    court_decision:
      'Mahkeme Kararı',
    notification:
      'Tebligat',
    evidence: 'Delil',
    correspondence:
      'Yazışma',
    other: 'Diğer',
  };

  return (
    labels[category] ||
    category ||
    'Genel'
  );
};

const getCategoryColor = (
  category
) => {
  const colors = {
    general:
      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',

    petition:
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',

    expert_report:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',

    court_decision:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',

    notification:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',

    evidence:
      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',

    correspondence:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',

    other:
      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    colors[category] ||
    colors.general
  );
};

const getFileIcon = (
  fileType
) => {
  switch (fileType) {
    case 'pdf':
      return '📄';

    case 'word':
      return '📝';

    case 'excel':
      return '📊';

    case 'udf':
      return '📑';

    case 'image':
      return '🖼️';

    default:
      return '📎';
  }
};

const getFileTypeLabel = (
  fileType
) => {
  const labels = {
    pdf: 'PDF',
    word: 'Word',
    excel: 'Excel',
    udf: 'UDF',
    image: 'Görsel',
    other: 'Dosya',
  };

  return (
    labels[fileType] ||
    fileType?.toUpperCase() ||
    'Dosya'
  );
};

const formatFileSize = (
  bytes
) => {
  const size =
    Number(bytes) || 0;

  if (size <= 0) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  const index = Math.min(
    Math.floor(
      Math.log(size) /
        Math.log(1024)
    ),
    units.length - 1
  );

  const value =
    size /
    1024 ** index;

  return `${Number(
    value.toFixed(2)
  )} ${units[index]}`;
};

const formatDateTime = (
  date
) => {
  if (!date) {
    return '-';
  }

  try {
    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'tr-TR',
      {
        timeZone:
          'Europe/Istanbul',

        day: '2-digit',
        month: '2-digit',
        year: 'numeric',

        hour: '2-digit',
        minute: '2-digit',

        hour12: false,
      }
    ).format(parsed);
  } catch {
    return '-';
  }
};

const getCaseDisplayName = (
  caseItem
) => {
  if (!caseItem) {
    return '-';
  }

  const courtName =
    String(
      caseItem.court_name ||
      ''
    ).trim();

  const caseNumber =
    String(
      caseItem.case_number ||
      ''
    ).trim();

  if (
    courtName &&
    caseNumber
  ) {
    return `${courtName} · ${caseNumber}`;
  }

  return (
    courtName ||
    caseNumber ||
    caseItem.title ||
    '-'
  );
};

const getConsultationDisplayName = (
  consultation
) => {
  if (!consultation) {
    return 'Danışmanlık';
  }

  const consultationNumber =
    String(
      consultation.consultation_number ||
      ''
    ).trim();

  const title =
    String(
      consultation.title ||
      ''
    ).trim();

  if (
    consultationNumber &&
    title
  ) {
    return `${consultationNumber} · ${title}`;
  }

  return (
    consultationNumber ||
    title ||
    'Danışmanlık'
  );
};

const getPersonName = (
  person
) => {
  if (!person) {
    return '-';
  }

  return (
    [
      person.first_name,
      person.last_name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    String(
      person.full_name ||
      person.name ||
      ''
    ).trim() ||
    '-'
  );
};

const getExtension = (
  filename
) => {
  const value =
    filename || '';

  const index =
    value.lastIndexOf('.');

  if (index < 0) {
    return '';
  }

  return value
    .slice(index)
    .toLowerCase();
};

const normalizeId = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  if (
    typeof value ===
    'object'
  ) {
    const objectId =
      value?.id;

    return objectId === null ||
      objectId === undefined ||
      objectId === ''
      ? ''
      : String(
          objectId
        );
  }

  return String(
    value
  );
};

const getArrayPayload = (
  response
) => {
  const payload =
    response?.data?.data ??
    response?.data ??
    response ??
    [];

  if (
    Array.isArray(
      payload
    )
  ) {
    return payload;
  }

  if (
    Array.isArray(
      payload?.data
    )
  ) {
    return payload.data;
  }

  if (
    Array.isArray(
      payload?.versions
    )
  ) {
    return payload.versions;
  }

  if (
    Array.isArray(
      payload?.items
    )
  ) {
    return payload.items;
  }

  return [];
};

const sanitizeDownloadFilename = (
  value,
  fallback = 'document'
) => {
  const normalized =
    String(
      value ||
      fallback
    )
      .replace(
        /[\r\n\0]/g,
        ''
      )
      .replace(
        /[\\/]+/g,
        '_'
      )
      .trim();

  return (
    normalized ||
    fallback
  ).slice(
    0,
    255
  );
};

const isSafeBrowserPreviewType = (
  contentType
) => {
  const normalized =
    String(
      contentType ||
      ''
    )
      .split(';')[0]
      .trim()
      .toLowerCase();

  if (
    !normalized
  ) {
    return false;
  }

  const blockedTypes = new Set([
    'text/html',
    'application/xhtml+xml',
    'image/svg+xml',
    'application/xml',
    'text/xml',
    'application/javascript',
    'text/javascript',
  ]);

  if (
    blockedTypes.has(
      normalized
    )
  ) {
    return false;
  }

  if (
    normalized ===
      'application/pdf' ||
    normalized ===
      'application/octet-stream' ||
    normalized ===
      'text/plain'
  ) {
    return true;
  }

  if (
    normalized.startsWith(
      'image/'
    ) ||
    normalized.startsWith(
      'video/'
    )
  ) {
    return true;
  }

  return [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ].includes(
    normalized
  );
};

const isUdfDocument = (
  document
) => {
  if (!document) {
    return false;
  }

  if (
    document.file_type ===
    'udf'
  ) {
    return true;
  }

  return (
    getExtension(
      document.original_name ||
        document.name
    ) === '.udf'
  );
};

// ======================================================
// DOWNLOAD FILENAME
// ======================================================

const getFilenameFromContentDisposition = (
  contentDisposition
) => {
  if (
    !contentDisposition ||
    typeof contentDisposition !==
      'string'
  ) {
    return null;
  }

  const utf8Match =
    contentDisposition.match(
      /filename\*\s*=\s*UTF-8''([^;]+)/i
    );

  if (
    utf8Match?.[1]
  ) {
    const value =
      utf8Match[1]
        .trim()
        .replace(
          /^["']|["']$/g,
          ''
        );

    try {
      return decodeURIComponent(
        value
      );
    } catch {
      return value;
    }
  }

  const filenameMatch =
    contentDisposition.match(
      /filename\s*=\s*"([^"]+)"/i
    ) ||
    contentDisposition.match(
      /filename\s*=\s*([^;]+)/i
    );

  if (
    filenameMatch?.[1]
  ) {
    return filenameMatch[1]
      .trim()
      .replace(
        /^["']|["']$/g,
        ''
      );
  }

  return null;
};

// ======================================================
// UDF RENDER HELPERS
// ======================================================

const getUdfNumber = (
  value,
  fallback = null
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
};

const parseUdfBoolean = (
  value
) => {
  return (
    value === true ||
    value === 'true' ||
    value === 1 ||
    value === '1'
  );
};

const normalizeUdfColor = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const stringValue =
    String(value).trim();

  if (
    /^#[0-9a-f]{3,8}$/i.test(
      stringValue
    )
  ) {
    return stringValue;
  }

  if (
    /^[0-9a-f]{6}$/i.test(
      stringValue
    )
  ) {
    return `#${stringValue}`;
  }

  const numeric =
    Number(stringValue);

  if (
    Number.isFinite(
      numeric
    )
  ) {
    const rgb =
      numeric &
      0xffffff;

    return `#${rgb
      .toString(16)
      .padStart(
        6,
        '0'
      )}`;
  }

  return null;
};

const collectUdfRanges = (
  node,
  ranges = [],
  parentKey = ''
) => {
  if (
    node === null ||
    node === undefined
  ) {
    return ranges;
  }

  if (
    Array.isArray(
      node
    )
  ) {
    node.forEach(
      (item) => {
        collectUdfRanges(
          item,
          ranges,
          parentKey
        );
      }
    );

    return ranges;
  }

  if (
    typeof node !==
    'object'
  ) {
    return ranges;
  }

  const start =
    getUdfNumber(
      node.startOffset ??
      node.startoffset ??
      node.start_offset ??
      node.start
    );

  const length =
    getUdfNumber(
      node.length ??
      node.textLength ??
      node.text_length
    );

  if (
    start !== null &&
    length !== null &&
    length > 0
  ) {
    ranges.push({
      type:
        parentKey,

      start,

      end:
        start +
        length,

      node,
    });
  }

  Object.entries(
    node
  ).forEach(
    ([
      key,
      value,
    ]) => {
      if (
        value &&
        typeof value ===
          'object'
      ) {
        collectUdfRanges(
          value,
          ranges,
          key
        );
      }
    }
  );

  return ranges;
};

const getUdfTextStyle = (
  node = {}
) => {
  const style = {};

  if (
    parseUdfBoolean(
      node.bold
    )
  ) {
    style.fontWeight =
      '700';
  }

  if (
    parseUdfBoolean(
      node.italic
    )
  ) {
    style.fontStyle =
      'italic';
  }

  const decorations = [];

  if (
    parseUdfBoolean(
      node.underline
    ) ||
    parseUdfBoolean(
      node.underlined
    )
  ) {
    decorations.push(
      'underline'
    );
  }

  if (
    parseUdfBoolean(
      node.strikeThrough
    ) ||
    parseUdfBoolean(
      node.strikethrough
    )
  ) {
    decorations.push(
      'line-through'
    );
  }

  if (
    decorations.length > 0
  ) {
    style.textDecoration =
      decorations.join(' ');
  }

  const fontFamily =
    node.fontFamily ||
    node.fontName ||
    node.font_family ||
    node.font_name ||
    node.font ||
    node.family;

  if (fontFamily) {
    style.fontFamily =
      String(fontFamily);
  }

  const fontSize =
    getUdfNumber(
      node.fontSize ??
      node.font_size ??
      node.size
    );

  if (
    fontSize !== null &&
    fontSize >= 6 &&
    fontSize <= 96
  ) {
    style.fontSize =
      `${fontSize}pt`;
  }

  const foreground =
    normalizeUdfColor(
      node.foreground ??
      node.foregroundColor ??
      node.foreground_color ??
      node.color
    );

  if (foreground) {
    style.color =
      foreground;
  }

  return style;
};

const getUdfParagraphStyle = (
  node = {}
) => {
  const style = {};

  const alignment =
    String(
      node.alignment ??
      node.align ??
      ''
    )
      .trim()
      .toLowerCase();

  if (
    alignment === 'center' ||
    alignment === '1'
  ) {
    style.textAlign =
      'center';
  } else if (
    alignment === 'right' ||
    alignment === '2'
  ) {
    style.textAlign =
      'right';
  } else if (
    alignment === 'justify' ||
    alignment === '3'
  ) {
    style.textAlign =
      'justify';
  } else {
    style.textAlign =
      'left';
  }

  const firstLineIndent =
    getUdfNumber(
      node.firstLineIndent ??
      node.first_line_indent
    );

  if (
    firstLineIndent !== null
  ) {
    style.textIndent =
      `${Math.max(
        firstLineIndent,
        0
      )}pt`;
  }

  const leftIndent =
    getUdfNumber(
      node.leftIndent ??
      node.left_indent
    );

  if (
    leftIndent !== null
  ) {
    style.marginLeft =
      `${Math.max(
        leftIndent,
        0
      )}pt`;
  }

  const rightIndent =
    getUdfNumber(
      node.rightIndent ??
      node.right_indent
    );

  if (
    rightIndent !== null
  ) {
    style.marginRight =
      `${Math.max(
        rightIndent,
        0
      )}pt`;
  }

  const spaceAbove =
    getUdfNumber(
      node.spaceAbove ??
      node.space_above
    );

  if (
    spaceAbove !== null
  ) {
    style.marginTop =
      `${Math.max(
        spaceAbove,
        0
      )}pt`;
  }

  const spaceBelow =
    getUdfNumber(
      node.spaceBelow ??
      node.space_below
    );

  if (
    spaceBelow !== null
  ) {
    style.marginBottom =
      `${Math.max(
        spaceBelow,
        0
      )}pt`;
  }

  return style;
};

const applyUdfStyles = (
  element,
  styles
) => {
  Object.entries(
    styles
  ).forEach(
    ([
      property,
      value,
    ]) => {
      try {
        element.style[
          property
        ] = value;
      } catch {
        // Geçersiz UDF stilini yok say.
      }
    }
  );
};

const renderUdfStyledText = ({
  previewDocument,
  container,
  text,
  absoluteStart,
  ranges,
}) => {
  if (!text) {
    return;
  }

  const absoluteEnd =
    absoluteStart +
    text.length;

  const relevantRanges =
    ranges.filter(
      (range) =>
        range.end >
          absoluteStart &&
        range.start <
          absoluteEnd
    );

  if (
    relevantRanges.length === 0
  ) {
    container.appendChild(
      previewDocument.createTextNode(
        text
      )
    );

    return;
  }

  const boundaries =
    new Set([
      absoluteStart,
      absoluteEnd,
    ]);

  relevantRanges.forEach(
    (range) => {
      boundaries.add(
        Math.max(
          absoluteStart,
          range.start
        )
      );

      boundaries.add(
        Math.min(
          absoluteEnd,
          range.end
        )
      );
    }
  );

  const sortedBoundaries =
    [
      ...boundaries,
    ].sort(
      (a, b) =>
        a - b
    );

  for (
    let index = 0;
    index <
      sortedBoundaries.length - 1;
    index += 1
  ) {
    const segmentStart =
      sortedBoundaries[
        index
      ];

    const segmentEnd =
      sortedBoundaries[
        index + 1
      ];

    if (
      segmentEnd <=
      segmentStart
    ) {
      continue;
    }

    const segmentText =
      text.slice(
        segmentStart -
          absoluteStart,
        segmentEnd -
          absoluteStart
      );

    const activeRanges =
      relevantRanges.filter(
        (range) =>
          range.start <=
            segmentStart &&
          range.end >=
            segmentEnd
      );

    if (
      activeRanges.length === 0
    ) {
      container.appendChild(
        previewDocument.createTextNode(
          segmentText
        )
      );

      continue;
    }

    const span =
      previewDocument.createElement(
        'span'
      );

    span.textContent =
      segmentText;

    activeRanges.forEach(
      (range) => {
        applyUdfStyles(
          span,
          getUdfTextStyle(
            range.node
          )
        );
      }
    );

    container.appendChild(
      span
    );
  }
};

const buildUdfDocumentBody = ({
  previewDocument,
  content,
  elements,
}) => {
  const wrapper =
    previewDocument.createElement(
      'div'
    );

  wrapper.className =
    'udf-document-body';

  const ranges =
    collectUdfRanges(
      elements
    );

  const paragraphRanges =
    ranges
      .filter(
        (range) => {
          const type =
            String(
              range.type ||
              ''
            )
              .toLowerCase();

          return (
            type.includes(
              'paragraph'
            ) ||
            type === 'p'
          );
        }
      )
      .sort(
        (a, b) =>
          a.start -
          b.start
      );

  if (
    paragraphRanges.length === 0
  ) {
    let currentOffset = 0;

    const lines =
      String(content)
        .replace(
          /\r\n/g,
          '\n'
        )
        .split('\n');

    lines.forEach(
      (line, index) => {
        const paragraph =
          previewDocument.createElement(
            'div'
          );

        paragraph.className =
          'udf-paragraph';

        renderUdfStyledText({
          previewDocument,
          container:
            paragraph,
          text:
            line,
          absoluteStart:
            currentOffset,
          ranges,
        });

        if (
          line.length === 0
        ) {
          paragraph.appendChild(
            previewDocument.createElement(
              'br'
            )
          );
        }

        wrapper.appendChild(
          paragraph
        );

        currentOffset +=
          line.length;

        if (
          index <
          lines.length - 1
        ) {
          currentOffset += 1;
        }
      }
    );

    return wrapper;
  }

  let cursor = 0;

  paragraphRanges.forEach(
    (range) => {
      const safeStart =
        Math.max(
          0,
          Math.min(
            content.length,
            range.start
          )
        );

      const safeEnd =
        Math.max(
          safeStart,
          Math.min(
            content.length,
            range.end
          )
        );

      if (
        safeStart >
        cursor
      ) {
        const loose =
          previewDocument.createElement(
            'div'
          );

        loose.className =
          'udf-paragraph';

        renderUdfStyledText({
          previewDocument,
          container:
            loose,
          text:
            content.slice(
              cursor,
              safeStart
            ),
          absoluteStart:
            cursor,
          ranges,
        });

        wrapper.appendChild(
          loose
        );
      }

      const paragraph =
        previewDocument.createElement(
          'div'
        );

      paragraph.className =
        'udf-paragraph';

      applyUdfStyles(
        paragraph,
        getUdfParagraphStyle(
          range.node
        )
      );

      const paragraphText =
        content
          .slice(
            safeStart,
            safeEnd
          )
          .replace(
            /\r?\n$/,
            ''
          );

      renderUdfStyledText({
        previewDocument,
        container:
          paragraph,
        text:
          paragraphText,
        absoluteStart:
          safeStart,
        ranges,
      });

      if (
        !paragraph.textContent
      ) {
        paragraph.appendChild(
          previewDocument.createElement(
            'br'
          )
        );
      }

      wrapper.appendChild(
        paragraph
      );

      cursor =
        Math.max(
          cursor,
          safeEnd
        );
    }
  );

  if (
    cursor <
    content.length
  ) {
    const remaining =
      previewDocument.createElement(
        'div'
      );

    remaining.className =
      'udf-paragraph';

    renderUdfStyledText({
      previewDocument,
      container:
        remaining,
      text:
        content.slice(
          cursor
        ),
      absoluteStart:
        cursor,
      ranges,
    });

    wrapper.appendChild(
      remaining
    );
  }

  return wrapper;
};

// ======================================================
// UDF PREVIEW WINDOW
// ======================================================

const renderUdfPreview = ({
  previewWindow,
  document,
  udf,
}) => {
  if (
    !previewWindow
  ) {
    throw new Error(
      'Önizleme penceresi açılamadı'
    );
  }

  const previewDocument =
    previewWindow.document;

  const pageWidth =
    getUdfNumber(
      udf?.page?.width,
      210
    );

  const pageHeight =
    getUdfNumber(
      udf?.page?.height,
      297
    );

  const marginTop =
    getUdfNumber(
      udf?.margins?.top,
      15
    );

  const marginRight =
    getUdfNumber(
      udf?.margins?.right,
      15
    );

  const marginBottom =
    getUdfNumber(
      udf?.margins?.bottom,
      15
    );

  const marginLeft =
    getUdfNumber(
      udf?.margins?.left,
      15
    );

  previewDocument.open();

  previewDocument.write(`
    <!DOCTYPE html>
    <html lang="tr">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <title>UDF Önizleme</title>
      </head>

      <body>
        <div id="udf-toolbar">
          <div id="udf-toolbar-left">
            <strong>UYAP UDF Belgesi</strong>
            <span id="udf-filename"></span>
          </div>

          <div id="udf-toolbar-right">
            <button
              id="udf-zoom-out"
              type="button"
              title="Uzaklaştır"
            >
              −
            </button>

            <span id="udf-zoom-value">
              100%
            </span>

            <button
              id="udf-zoom-in"
              type="button"
              title="Yakınlaştır"
            >
              +
            </button>

            <button
              id="udf-print"
              type="button"
            >
              Yazdır
            </button>
          </div>
        </div>

        <div id="udf-workspace">
          <main id="udf-page">
            <div id="udf-content"></div>
          </main>
        </div>
      </body>
    </html>
  `);

  previewDocument.close();

  previewDocument.title =
    document?.original_name ||
    document?.name ||
    'UDF Belgesi';

  const style =
    previewDocument.createElement(
      'style'
    );

  style.textContent = `
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      min-height: 100%;
    }

    body {
      background: #e9edf2;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
    }

    #udf-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      min-height: 58px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 10px 18px;
      background: #ffffff;
      border-bottom: 1px solid #d8dee7;
      box-shadow: 0 1px 5px rgba(15, 23, 42, 0.08);
    }

    #udf-toolbar-left {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    #udf-toolbar-left strong {
      font-size: 14px;
      color: #0f172a;
    }

    #udf-filename {
      max-width: 60vw;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #64748b;
      font-size: 12px;
    }

    #udf-toolbar-right {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    #udf-toolbar button {
      height: 34px;
      min-width: 34px;
      padding: 0 11px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      background: #ffffff;
      color: #334155;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }

    #udf-toolbar button:hover {
      background: #f8fafc;
    }

    #udf-zoom-value {
      min-width: 48px;
      text-align: center;
      color: #475569;
      font-size: 12px;
      font-weight: 600;
    }

    #udf-workspace {
      min-height: calc(100vh - 58px);
      padding: 32px 16px 60px;
      overflow: auto;
    }

    #udf-page {
      width: ${pageWidth}mm;
      min-height: ${pageHeight}mm;
      margin: 0 auto;
      padding:
        ${marginTop}mm
        ${marginRight}mm
        ${marginBottom}mm
        ${marginLeft}mm;
      background: #ffffff;
      box-shadow: 0 5px 25px rgba(15, 23, 42, 0.16);
      transform-origin: top center;
    }

    #udf-content {
      width: 100%;
      color: #111827;
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.35;
      white-space: normal;
      word-break: normal;
      overflow-wrap: break-word;
    }

    .udf-document-body {
      width: 100%;
    }

    .udf-paragraph {
      min-height: 1.35em;
      margin: 0;
      white-space: pre-wrap;
    }

    @media print {
      body {
        background: #ffffff;
      }

      #udf-toolbar {
        display: none !important;
      }

      #udf-workspace {
        padding: 0;
      }

      #udf-page {
        width: ${pageWidth}mm;
        min-height: ${pageHeight}mm;
        margin: 0;
        box-shadow: none;
        transform: none !important;
      }

      @page {
        size: ${pageWidth}mm ${pageHeight}mm;
        margin: 0;
      }
    }

    @media (max-width: 720px) {
      #udf-workspace {
        padding: 8px 8px 30px;
      }

      #udf-page {
        width: calc(100vw - 16px);
        min-height: auto;
        padding: 20px 16px;
      }

      #udf-filename {
        max-width: 42vw;
      }
    }
  `;

  previewDocument.head.appendChild(
    style
  );

  const filenameElement =
    previewDocument.getElementById(
      'udf-filename'
    );

  if (filenameElement) {
    filenameElement.textContent =
      document?.original_name ||
      document?.name ||
      'document.udf';
  }

  const contentElement =
    previewDocument.getElementById(
      'udf-content'
    );

  if (!contentElement) {
    throw new Error(
      'UDF içerik alanı oluşturulamadı'
    );
  }

  /*
   * Güvenlik:
   * UDF içeriği innerHTML ile çalıştırılmaz.
   * Metin text node'ları ve güvenli DOM elementleriyle
   * oluşturulur.
   */
  const documentBody =
    buildUdfDocumentBody({
      previewDocument,
      content:
        String(
          udf?.content ||
          ''
        ),
      elements:
        udf?.elements ||
        null,
    });

  contentElement.appendChild(
    documentBody
  );

  let zoom = 1;

  const pageElement =
    previewDocument.getElementById(
      'udf-page'
    );

  const zoomValue =
    previewDocument.getElementById(
      'udf-zoom-value'
    );

  const updateZoom = () => {
    if (!pageElement) {
      return;
    }

    pageElement.style.transform =
      `scale(${zoom})`;

    if (zoomValue) {
      zoomValue.textContent =
        `${Math.round(
          zoom * 100
        )}%`;
    }
  };

  previewDocument
    .getElementById(
      'udf-zoom-in'
    )
    ?.addEventListener(
      'click',
      () => {
        zoom =
          Math.min(
            zoom + 0.1,
            2
          );

        updateZoom();
      }
    );

  previewDocument
    .getElementById(
      'udf-zoom-out'
    )
    ?.addEventListener(
      'click',
      () => {
        zoom =
          Math.max(
            zoom - 0.1,
            0.5
          );

        updateZoom();
      }
    );

  previewDocument
    .getElementById(
      'udf-print'
    )
    ?.addEventListener(
      'click',
      () => {
        previewWindow.print();
      }
    );

  previewWindow.opener =
    null;

  previewWindow.focus();
};

// ======================================================
// COMPONENT
// ======================================================

const DocumentDetail = () => {
  const {
    id: idParam,
  } =
    useParams();

  const id =
    normalizeId(
      idParam
    );

  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const fileInputRef =
    useRef(null);

  const [
    downloadingId,
    setDownloadingId,
  ] = useState('');

  const [
    previewingId,
    setPreviewingId,
  ] = useState('');

  const [
    showVersionModal,
    setShowVersionModal,
  ] = useState(false);

  const [
    versionFile,
    setVersionFile,
  ] = useState(null);

  const [
    versionDescription,
    setVersionDescription,
  ] = useState('');

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_DOCUMENTS
    );

  const canDownload =
    hasPermission(
      user,
      PERMISSION_KEYS.DOWNLOAD_DOCUMENTS
    );

  const canUploadVersion =
    hasPermission(
      user,
      PERMISSION_KEYS.MANAGE_DOCUMENT_VERSIONS
    );

  // ======================================================
  // DOCUMENT QUERY
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } = useDocument(id);

  const documentItem =
    data?.data?.data ??
    data?.data ??
    null;

  // ======================================================
  // VERSIONS QUERY
  // ======================================================

  const {
    data: versionsData,
    isLoading:
      versionsLoading,
    isFetching:
      versionsFetching,
    error:
      versionsError,
    refetch:
      refetchVersions,
  } =
    useDocumentVersions(
      id
    );

  const versions =
    getArrayPayload(
      versionsData
    );

  // ======================================================
  // VERSION UPLOAD MUTATION
  // ======================================================

  const uploadVersionMutation =
    useUploadDocumentVersion();

  useEffect(() => {
    if (
      !showVersionModal
    ) {
      return undefined;
    }

    const previousOverflow =
      window.document.body
        .style.overflow;

    window.document.body
      .style.overflow =
      'hidden';

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
            'Escape' &&
          !uploadVersionMutation
            .isPending
        ) {
          setShowVersionModal(
            false
          );

          setVersionFile(
            null
          );

          setVersionDescription(
            ''
          );

          if (
            fileInputRef.current
          ) {
            fileInputRef.current.value =
              '';
          }
        }
      };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      window.document.body
        .style.overflow =
        previousOverflow;
    };
  }, [
    showVersionModal,
    uploadVersionMutation.isPending,
  ]);

  // ======================================================
  // CURRENT / LATEST VERSION
  // ======================================================

  const versionHistory =
    useMemo(() => {
      if (
        !documentItem
      ) {
        return [];
      }

      const candidates = [
        documentItem,
        ...(
          Array.isArray(
            versions
          )
            ? versions
            : []
        ),
      ];

      const seen =
        new Set();

      return candidates
        .filter(Boolean)
        .filter(
          (
            item
          ) => {
            const itemId =
              normalizeId(
                item?.id
              );

            const version =
              Number(
                item?.version
              ) || 1;

            const key =
              itemId
                ? `id:${itemId}:version:${version}`
                : `version:${version}:${item?.original_name || ''}`;

            if (
              seen.has(
                key
              )
            ) {
              return false;
            }

            seen.add(
              key
            );

            return true;
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            (
              Number(
                b?.version
              ) || 1
            ) -
            (
              Number(
                a?.version
              ) || 1
            )
        );
    }, [
      documentItem,
      versions,
    ]);

  const currentDocument =
    versionHistory[0] ||
    documentItem ||
    null;

  const latestVersion =
    Number(
      currentDocument?.version
    ) || 1;

  const hasNewerVersion =
    Boolean(
      documentItem &&
      currentDocument &&
      (
        Number(
          currentDocument.version
        ) || 1
      ) >
        (
          Number(
            documentItem.version
          ) || 1
        )
    );

  const documentTags =
    useMemo(() => {
      if (
        Array.isArray(
          documentItem?.tags
        )
      ) {
        return documentItem.tags
          .map(
            (tag) =>
              String(
                tag ||
                ''
              ).trim()
          )
          .filter(Boolean);
      }

      return String(
        documentItem?.tags ||
        ''
      )
        .split(',')
        .map(
          (tag) =>
            tag.trim()
        )
        .filter(Boolean);
    }, [
      documentItem?.tags,
    ]);

  // ======================================================
  // DOWNLOAD
  // ======================================================

  const handleDownload = async (
    targetDocument =
      currentDocument
  ) => {
    if (!canDownload) {
      toast.error(
        'Belge indirme yetkiniz bulunmuyor.'
      );

      return;
    }

    const targetId =
      normalizeId(
        targetDocument?.id
      );

    if (
      !targetId
    ) {
      toast.error(
        'İndirilecek belge bulunamadı'
      );

      return;
    }

    if (
      downloadingId ===
      targetId
    ) {
      return;
    }

    let objectUrl = null;
    let anchor = null;

    setDownloadingId(
      targetId
    );

    try {
      const response =
        await documentApi.download(
          targetId
        );

      const contentType =
        response.headers?.[
          'content-type'
        ] ||
        targetDocument.mime_type ||
        'application/octet-stream';

      const contentDisposition =
        response.headers?.[
          'content-disposition'
        ];

      const serverFilename =
        getFilenameFromContentDisposition(
          contentDisposition
        );

      const downloadFilename =
        sanitizeDownloadFilename(
          serverFilename ||
          targetDocument.original_name ||
          targetDocument.name,
          'document'
        );

      const blob =
        response.data instanceof
          Blob
          ? response.data
          : new Blob(
              [
                response.data,
              ],
              {
                type:
                  contentType,
              }
            );

      if (
        blob.size <= 0
      ) {
        throw new Error(
          'Sunucu boş dosya döndürdü'
        );
      }

      objectUrl =
        window.URL.createObjectURL(
          blob
        );

      anchor =
        window.document.createElement(
          'a'
        );

      anchor.href =
        objectUrl;

      anchor.download =
        downloadFilename;

      anchor.style.display =
        'none';

      window.document.body.appendChild(
        anchor
      );

      anchor.click();

      toast.success(
        `v${targetDocument.version || 1} indirildi`
      );
    } catch (downloadError) {
      console.error(
        'Document download error:',
        downloadError
      );

      toast.error(
        downloadError?.response
          ?.data?.message ||
        downloadError?.message ||
        'Dosya indirilemedi'
      );
    } finally {
      setDownloadingId(
        ''
      );
      if (
        anchor?.parentNode
      ) {
        anchor.parentNode.removeChild(
          anchor
        );
      }

      if (objectUrl) {
        window.URL.revokeObjectURL(
          objectUrl
        );
      }
    }
  };

  // ======================================================
  // PREVIEW
  // ======================================================

 // ======================================================
// PREVIEW
// ======================================================

const handlePreview = async (
  targetDocument =
    currentDocument
) => {
  const targetId =
    normalizeId(
      targetDocument?.id
    );

  if (
    !targetId
  ) {
    toast.error(
      'Önizlenecek belge bulunamadı'
    );

    return;
  }

  if (
    previewingId ===
    targetId
  ) {
    return;
  }

  /*
   * Popup kullanıcı tıklaması sırasında açılır.
   *
   * API cevabından sonra window.open yapılırsa
   * browser popup blocker tarafından engellenebilir.
   */
  const previewWindow =
    window.open(
      '',
      '_blank'
    );

  if (
    !previewWindow
  ) {
    toast.error(
      'Önizleme penceresi açılamadı. Tarayıcı açılır pencere iznini kontrol edin.'
    );

    return;
  }

  previewWindow.opener =
    null;

  setPreviewingId(
    targetId
  );

  try {
    // ==================================================
    // UDF
    // ==================================================

    if (
      isUdfDocument(
        targetDocument
      )
    ) {
      previewWindow.document.title =
        'UDF yükleniyor...';

      /*
       * Loading ekranını DOM API ile oluşturuyoruz.
       */
      previewWindow.document.body.textContent =
        '';

      const loading =
        previewWindow.document.createElement(
          'div'
        );

      loading.textContent =
        'UDF belgesi hazırlanıyor...';

      loading.style.cssText = `
        padding: 40px;
        font-family: Arial, sans-serif;
        color: #475569;
        text-align: center;
      `;

      previewWindow.document.body.appendChild(
        loading
      );

      /*
       * UDF artık frontend'de parse edilmez.
       *
       * Backend:
       *
       * - dosyayı okur
       * - UDF/XML yapısını parse eder
       * - güvenli preview JSON'u döndürür
       */
      const response =
        await documentApi.udfPreview(
          targetId
        );

      /*
       * successResponse yapısına göre:
       *
       * {
       *   success: true,
       *   data: {
       *     content: "...",
       *     elements: {...},
       *     page: {
       *       width_mm: 210,
       *       height_mm: 297,
       *       margins: {...}
       *     }
       *   }
       * }
       *
       * Axios nedeniyle response.data HTTP body'dir.
       */
      const udf =
        response?.data?.data ??
        response?.data;

      if (
        !udf ||
        typeof udf.content !==
          'string'
      ) {
        throw new Error(
          'UDF önizleme verisi geçersiz'
        );
      }

      /*
       * Backend margin göndermediyse güvenli
       * varsayılan değerleri kullan.
       */
      const getNumericValue = (
        value,
        fallback
      ) => {
        const number =
          Number(value);

        return Number.isFinite(
          number
        )
          ? number
          : fallback;
      };

      const normalizedUdf = {
        content:
          udf.content,

        elements:
          udf.elements ||
          null,

        page: {
          width:
            getNumericValue(
              udf.page?.width_mm,
              210
            ),

          height:
            getNumericValue(
              udf.page?.height_mm,
              297
            ),

          orientation:
            udf.page?.orientation ||
            '1',
        },

        margins: {
          top:
            getNumericValue(
              udf.page?.margins?.top,
              15
            ),

          right:
            getNumericValue(
              udf.page?.margins?.right,
              15
            ),

          bottom:
            getNumericValue(
              udf.page?.margins?.bottom,
              15
            ),

          left:
            getNumericValue(
              udf.page?.margins?.left,
              15
            ),
        },

        signature:
          udf.signature ||
          null,

        formatVersion:
          udf.format_version ||
          null,
      };

      renderUdfPreview({
        previewWindow,

        document:
          targetDocument,

        udf:
          normalizedUdf,
      });

      return;
    }

    // ==================================================
    // NORMAL FILE PREVIEW
    // ==================================================

    /*
     * PDF / image / browser'ın desteklediği diğer
     * dosyalarda binary preview sistemi devam eder.
     */
    const response =
      await documentApi.preview(
        targetId
      );

    const contentType =
      response.headers?.[
        'content-type'
      ] ||
      targetDocument.mime_type ||
      'application/octet-stream';

    if (
      !isSafeBrowserPreviewType(
        contentType
      )
    ) {
      throw new Error(
        'Bu dosya türü güvenli tarayıcı önizlemesi için desteklenmiyor'
      );
    }

    const blob =
      response.data instanceof Blob
        ? response.data
        : new Blob(
            [
              response.data,
            ],
            {
              type:
                contentType,
            }
          );

    if (
      blob.size <= 0
    ) {
      throw new Error(
        'Sunucu boş önizleme verisi döndürdü'
      );
    }

    const url =
      window.URL.createObjectURL(
        blob
      );

    previewWindow.location.href =
      url;

    /*
     * Blob URL sonsuza kadar memory'de tutulmaz.
     *
     * Browser'ın dosyayı yüklemesi için yeterli süre
     * bırakıyoruz.
     */
    window.setTimeout(
      () => {
        window.URL.revokeObjectURL(
          url
        );
      },
      60_000
    );
  } catch (
    previewError
  ) {
    console.error(
      'Document preview error:',
      previewError
    );

    if (
      previewWindow &&
      !previewWindow.closed
    ) {
      previewWindow.close();
    }

    /*
     * Axios JSON hata cevabı öncelikli.
     */
    toast.error(
      previewError?.response
        ?.data?.message ||
      previewError?.message ||
      'Belge önizlenemedi'
    );
  } finally {
    setPreviewingId(
      ''
    );
  }
};

  // ======================================================
  // VERSION FILE
  // ======================================================

  const handleVersionFileChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      setVersionFile(
        null
      );

      return;
    }

    if (
      Number(
        file.size
      ) <= 0
    ) {
      toast.error(
        'Boş dosya yeni versiyon olarak yüklenemez'
      );

      event.target.value =
        '';

      setVersionFile(
        null
      );

      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      toast.error(
        'Dosya boyutu en fazla 10 MB olabilir'
      );

      event.target.value =
        '';

      setVersionFile(
        null
      );

      return;
    }

    const extension =
      getExtension(
        file.name
      );

    if (
      !ALLOWED_EXTENSIONS.includes(
        extension
      )
    ) {
      toast.error(
        'Desteklenmeyen dosya türü'
      );

      event.target.value =
        '';

      setVersionFile(
        null
      );

      return;
    }

    setVersionFile(
      file
    );
  };

  // ======================================================
  // UPLOAD VERSION
  // ======================================================

  const handleUploadVersion =
    () => {
      if (!canUploadVersion) {
        toast.error(
          'Belge versiyonu yönetme yetkiniz bulunmuyor.'
        );

        return;
      }

      if (
        uploadVersionMutation
          .isPending
      ) {
        return;
      }

      if (
        !id
      ) {
        toast.error(
          'Geçerli belge kaydı bulunamadı'
        );

        return;
      }

      if (!versionFile) {
        toast.error(
          'Yeni versiyon dosyasını seçin'
        );

        return;
      }

      const formData =
        new FormData();

      formData.append(
        'file',
        versionFile
      );

      const normalizedDescription =
        versionDescription
          .trim()
          .slice(
            0,
            3000
          );

      if (
        normalizedDescription
      ) {
        formData.append(
          'description',
          normalizedDescription
        );
      }

      uploadVersionMutation.mutate(
        {
          documentId: id,
          formData,
        },
        {
          onSuccess: () => {
            setShowVersionModal(
              false
            );

            setVersionFile(
              null
            );

            setVersionDescription(
              ''
            );

            if (
              fileInputRef.current
            ) {
              fileInputRef.current.value =
                '';
            }
          },
        }
      );
    };

  // ======================================================
  // CLOSE VERSION MODAL
  // ======================================================

  const handleCloseVersionModal =
    () => {
      if (
        uploadVersionMutation.isPending
      ) {
        return;
      }

      setShowVersionModal(
        false
      );

      setVersionFile(
        null
      );

      setVersionDescription(
        ''
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          '';
      }
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    error ||
    !documentItem
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mb-4 text-6xl">
          📄
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Belge Bulunamadı
        </h2>

        <p className="mt-2 text-gray-500">
          {error?.response
            ?.data?.message ||
            error?.message ||
            'Belge detayları yüklenemedi'}
        </p>

        <Link
          to="/documents"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          ← Belgeler Listesine Dön
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* HEADER */}

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <Link
            to="/documents"
            className="text-blue-600 hover:underline"
          >
            ← Belgeler
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-2">

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {documentItem.name ||
                'Başlıksız Belge'}
            </h1>

            <Badge variant="info">
              Güncel v
              {latestVersion}
            </Badge>

            {currentDocument?.file_type && (
              <Badge variant="default">
                {getFileTypeLabel(
                  currentDocument.file_type
                )}
              </Badge>
            )}

            {documentItem.is_archived && (
              <Badge variant="warning">
                Arşivlendi
              </Badge>
            )}

          </div>

          <p className="mt-1 text-sm text-gray-500">
            Belge ailesi ·{' '}
            {versionHistory.length ||
              1}{' '}
            versiyon
          </p>

        </div>

        <div className="flex flex-wrap gap-2">

          <Button
            variant="outline"
            loading={
              previewingId ===
              normalizeId(
                currentDocument?.id
              )
            }
            disabled={
              Boolean(
                previewingId
              )
            }
            onClick={() =>
              handlePreview()
            }
          >
            <Eye className="mr-2 h-4 w-4" />

            Günceli Aç
          </Button>

          {canDownload && (
            <Button
              variant="outline"
              loading={
                downloadingId ===
                normalizeId(
                  currentDocument?.id
                )
              }
              disabled={
                Boolean(
                  downloadingId
                )
              }
              onClick={() =>
                handleDownload()
              }
            >
              <Download className="mr-2 h-4 w-4" />

              Günceli İndir
            </Button>
          )}

          {canUploadVersion && (
            <Button
              variant="outline"
              onClick={() =>
                setShowVersionModal(
                  true
                )
              }
            >
              <UploadCloud className="mr-2 h-4 w-4" />

              Yeni Versiyon
            </Button>
          )}

          {canEdit && (
            <Button
              variant="secondary"
              onClick={() =>
                navigate(
                  `/documents/${id}/edit`
                )
              }
            >
              <Pencil className="mr-2 h-4 w-4" />

              Düzenle
            </Button>
          )}

        </div>

      </div>

      {/* NEWER VERSION INFO */}

      {hasNewerVersion && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">

          <p className="font-medium text-blue-900 dark:text-blue-200">
            Güncel belge sürümü v
            {latestVersion}
          </p>

          <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
            Bu belge ailesinin daha yeni bir sürümü bulunuyor.
            Önizleme ve indirme işlemleri varsayılan olarak en güncel versiyon üzerinden yapılır.
          </p>

        </div>
      )}

      {/* UDF INFO */}

      {isUdfDocument(
        currentDocument
      ) && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-800 dark:bg-cyan-900/20">

          <p className="font-medium text-cyan-900 dark:text-cyan-200">
            📑 UYAP UDF Belgesi
          </p>

          <p className="mt-1 text-sm leading-6 text-cyan-800 dark:text-cyan-300">
            Bu belge UDF formatındadır. Aç butonuyla belge
            içeriğini doğrudan tarayıcıda görüntüleyebilirsiniz.
            Orijinal UDF dosyası değiştirilmeden saklanır.
          </p>

        </div>
      )}

      {/* FILE SUMMARY */}

      <Card>

        <div className="space-y-6 p-6">

          <div className="flex items-start gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">

            <span className="text-5xl">
              {getFileIcon(
                currentDocument?.file_type
              )}
            </span>

            <div className="min-w-0 flex-1">

              <div className="flex flex-wrap items-center gap-2">

                <p className="text-sm text-gray-500">
                  Güncel Dosya
                </p>

                <Badge variant="success">
                  v
                  {currentDocument?.version ||
                    1}
                </Badge>

              </div>

              <p className="mt-1 break-all font-medium text-gray-900 dark:text-white">
                {
                  currentDocument?.original_name ||
                  currentDocument?.name ||
                  '-'
                }
              </p>

              <div className="mt-3 flex flex-wrap gap-2">

                <Badge variant="default">
                  {formatFileSize(
                    currentDocument?.file_size
                  )}
                </Badge>

                <Badge variant="default">
                  {currentDocument?.mime_type ||
                    'Bilinmiyor'}
                </Badge>

                {currentDocument?.file_type && (
                  <Badge variant="default">
                    {getFileTypeLabel(
                      currentDocument.file_type
                    )}
                  </Badge>
                )}

              </div>

              {currentDocument?.created_at && (
                <p className="mt-3 text-xs text-gray-500">
                  Bu sürüm{' '}
                  {formatDateTime(
                    currentDocument.created_at
                  )}{' '}
                  tarihinde yüklendi.
                </p>
              )}

            </div>

          </div>

          {/* LOGICAL DOCUMENT INFO */}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <div>

              <p className="text-sm text-gray-500">
                Kategori
              </p>

              <Badge
                className={`mt-1 ${getCategoryColor(
                  documentItem.category
                )}`}
              >
                {getCategoryLabel(
                  documentItem.category
                )}
              </Badge>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                İlk Yükleyen
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {getPersonName(
                  documentItem.uploader
                )}
              </p>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                İlk Yüklenme Tarihi
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {formatDateTime(
                  documentItem.created_at
                )}
              </p>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                Güncel Versiyon Tarihi
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {formatDateTime(
                  currentDocument?.created_at
                )}
              </p>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                İlişkili Dava
              </p>

              {normalizeId(
                documentItem.case?.id ??
                documentItem.case_id
              ) ? (
                <Link
                  to={`/cases/${normalizeId(
                    documentItem.case?.id ??
                    documentItem.case_id
                  )}`}
                  className="mt-1 block font-medium text-blue-600 hover:underline"
                >
                  {documentItem.case
                    ? getCaseDisplayName(
                        documentItem.case
                      )
                    : 'Davayı Görüntüle'}
                </Link>
              ) : (
                <span className="mt-1 block text-gray-400">
                  -
                </span>
              )}

            </div>

            <div>

              <p className="text-sm text-gray-500">
                İlişkili Müvekkil
              </p>

              {normalizeId(
                documentItem.client?.id ??
                documentItem.client_id
              ) ? (
                <Link
                  to={`/clients/${normalizeId(
                    documentItem.client?.id ??
                    documentItem.client_id
                  )}`}
                  className="mt-1 block font-medium text-blue-600 hover:underline"
                >
                  {documentItem.client?.name ||
                    'Müvekkili Görüntüle'}
                </Link>
              ) : (
                <span className="mt-1 block text-gray-400">
                  -
                </span>
              )}

            </div>

            <div>

              <p className="text-sm text-gray-500">
                İlişkili Danışmanlık
              </p>

              {normalizeId(
                documentItem.consultation?.id ??
                documentItem.consultation_id
              ) ? (
                <Link
                  to={`/consultations/${normalizeId(
                    documentItem.consultation?.id ??
                    documentItem.consultation_id
                  )}`}
                  className="mt-1 block font-medium text-blue-600 hover:underline"
                >
                  {documentItem.consultation
                    ? getConsultationDisplayName(
                        documentItem.consultation
                      )
                    : 'Danışmanlığı Görüntüle'}
                </Link>
              ) : (
                <span className="mt-1 block text-gray-400">
                  -
                </span>
              )}

            </div>

            {(
              documentItem.powerOfAttorney ||
              documentItem.power_of_attorney ||
              documentItem.power_of_attorney_id
            ) && (
              <div>

                <p className="text-sm text-gray-500">
                  İlişkili Vekâletname
                </p>

                {normalizeId(
                  (
                    documentItem.powerOfAttorney ||
                    documentItem.power_of_attorney
                  )?.id ??
                    documentItem.power_of_attorney_id
                ) ? (
                  <Link
                    to={`/power-of-attorney/${normalizeId(
                      (
                        documentItem.powerOfAttorney ||
                        documentItem.power_of_attorney
                      )?.id ??
                        documentItem.power_of_attorney_id
                    )}`}
                    className="mt-1 block font-medium text-blue-600 hover:underline"
                  >
                    {(
                      documentItem.powerOfAttorney ||
                      documentItem.power_of_attorney
                    )?.title ||
                      'Vekâletnameyi Görüntüle'}
                  </Link>
                ) : (
                  <span className="mt-1 block font-medium text-gray-900 dark:text-white">
                    {(
                      documentItem.powerOfAttorney ||
                      documentItem.power_of_attorney
                    )?.title ||
                      'Vekâletname'}
                  </span>
                )}

              </div>
            )}

            <div>

              <p className="text-sm text-gray-500">
                Erişim
              </p>

              <Badge
                className={
                  documentItem.is_public
                    ? 'mt-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                    : 'mt-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }
              >
                {documentItem.is_public
                  ? '🌐 Büro içi genel erişim'
                  : '🔒 Kısıtlı'}
              </Badge>

            </div>

          </div>

          {/* TAGS */}

          {documentTags.length >
            0 && (
              <div>

                <p className="mb-2 text-sm text-gray-500">
                  Etiketler
                </p>

                <div className="flex flex-wrap gap-2">

                  {documentTags.map(
                    (tag) => (
                      <Badge
                        key={tag}
                        variant="default"
                        className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        #{tag}
                      </Badge>
                    )
                  )}

                </div>

              </div>
            )}

          {/* DESCRIPTION */}

          {documentItem.description && (
            <div>

              <p className="mb-2 text-sm text-gray-500">
                Belge Açıklaması
              </p>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">

                <p className="whitespace-pre-wrap leading-7 text-gray-700 dark:text-gray-300">
                  {
                    documentItem.description
                  }
                </p>

              </div>

            </div>
          )}

          {hasNewerVersion &&
            currentDocument?.description &&
            currentDocument.description !==
              documentItem.description && (
              <div>

                <p className="mb-2 text-sm text-gray-500">
                  Güncel Versiyon Notu
                </p>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">

                  <p className="whitespace-pre-wrap leading-7 text-blue-900 dark:text-blue-200">
                    {
                      currentDocument.description
                    }
                  </p>

                </div>

              </div>
            )}

        </div>

      </Card>

      {/* VERSION HISTORY */}

      <Card>

        <Card.Header>

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <History className="h-5 w-5 text-blue-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Versiyon Geçmişi
                </h2>

                <p className="text-xs text-gray-500">
                  Belgenin tüm kayıtlı sürümleri
                </p>

              </div>

            </div>

            <Badge variant="info">
              Güncel: v
              {latestVersion}
            </Badge>

          </div>

        </Card.Header>

        <Card.Body>

          {versionsLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Versiyonlar yükleniyor...
            </div>
          ) : versionsError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                Versiyon geçmişi yüklenemedi.
              </p>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                loading={
                  versionsFetching
                }
                onClick={() =>
                  refetchVersions()
                }
              >
                Tekrar Dene
              </Button>
            </div>
          ) : versionHistory.length ===
              0 ? (
            <div className="py-8 text-center">

              <FileClock className="mx-auto h-8 w-8 text-gray-400" />

              <p className="mt-2 text-sm text-gray-500">
                Henüz versiyon geçmişi bulunmuyor.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {versionHistory.map(
                (version) => {
                  const isLatest =
                    Number(
                      version.version
                    ) ===
                    latestVersion;

                  const isRoot =
                    normalizeId(
                      version.id
                    ) ===
                    normalizeId(
                      documentItem.id
                    );

                  const isUdf =
                    isUdfDocument(
                      version
                    );

                  return (
                    <div
                      key={
                        version.id
                      }
                      className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
                    >

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <p className="font-medium text-gray-900 dark:text-white">
                            v
                            {
                              version.version
                            }
                          </p>

                          {isLatest && (
                            <Badge variant="success">
                              Güncel
                            </Badge>
                          )}

                          {isRoot && (
                            <Badge variant="default">
                              İlk Sürüm
                            </Badge>
                          )}

                          {isUdf && (
                            <Badge variant="info">
                              UDF
                            </Badge>
                          )}

                        </div>

                        <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-300">
                          {
                            version.original_name
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {formatDateTime(
                            version.created_at
                          )}
                          {' · '}
                          {formatFileSize(
                            version.file_size
                          )}
                          {' · '}
                          {getPersonName(
                            version.uploader
                          )}
                        </p>

                        {version.description && (
                          <p className="mt-2 text-xs text-gray-500">
                            {
                              version.description
                            }
                          </p>
                        )}

                      </div>

                      <div className="flex shrink-0 gap-2">

                        <Button
                          size="sm"
                          variant="outline"
                          loading={
                            previewingId ===
                            normalizeId(
                              version.id
                            )
                          }
                          disabled={
                            Boolean(
                              previewingId
                            )
                          }
                          onClick={() =>
                            handlePreview(
                              version
                            )
                          }
                        >
                          <Eye className="mr-1 h-4 w-4" />

                          Aç
                        </Button>

                        {canDownload && (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={
                              downloadingId ===
                              normalizeId(
                                version.id
                              )
                            }
                            disabled={
                              Boolean(
                                downloadingId
                              )
                            }
                            onClick={() =>
                              handleDownload(
                                version
                              )
                            }
                          >
                            <Download className="mr-1 h-4 w-4" />

                            İndir
                          </Button>
                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </Card.Body>

      </Card>

      {/* VERSION MODAL */}

      {canUploadVersion &&
        showVersionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
        >

          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-version-modal-title"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h3
                  id="document-version-modal-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  Yeni Belge Versiyonu
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Mevcut sürümler korunur. Yeni dosya v
                  {latestVersion + 1}{' '}
                  olarak kaydedilecektir.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  handleCloseVersionModal
                }
                disabled={
                  uploadVersionMutation.isPending
                }
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                aria-label="Pencereyi kapat"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="mt-6 space-y-4">

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Yeni Dosya *
                </label>

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  onChange={
                    handleVersionFileChange
                  }
                  accept={ALLOWED_EXTENSIONS.join(
                    ','
                  )}
                  disabled={
                    uploadVersionMutation.isPending
                  }
                  className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />

                <p className="mt-1 text-xs text-gray-500">
                  PDF, Word, Excel, görsel, video ve UDF · Maksimum 10 MB
                </p>

              </div>

              {versionFile && (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">

                  <div className="flex items-center gap-2">

                    <span className="text-xl">
                      {getExtension(
                        versionFile.name
                      ) === '.udf'
                        ? '📑'
                        : '📎'}
                    </span>

                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {
                        versionFile.name
                      }
                    </p>

                  </div>

                  <p className="mt-1 text-xs text-gray-500">
                    {formatFileSize(
                      versionFile.size
                    )}
                  </p>

                </div>
              )}

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Versiyon Notu
                </label>

                <textarea
                  rows="3"
                  value={
                    versionDescription
                  }
                  disabled={
                    uploadVersionMutation.isPending
                  }
                  onChange={(event) =>
                    setVersionDescription(
                      event.target
                        .value
                    )
                  }
                  maxLength={3000}
                  placeholder="Bu versiyonda ne değişti?"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />

              </div>

            </div>

            <div className="mt-6 flex gap-3">

              <Button
                onClick={
                  handleUploadVersion
                }
                loading={
                  uploadVersionMutation.isPending
                }
                disabled={
                  !versionFile ||
                  uploadVersionMutation.isPending
                }
                className="flex-1"
              >
                <UploadCloud className="mr-2 h-4 w-4" />

                v
                {latestVersion + 1}{' '}
                Yükle
              </Button>

              <Button
                variant="secondary"
                disabled={
                  uploadVersionMutation.isPending
                }
                onClick={
                  handleCloseVersionModal
                }
              >
                Vazgeç
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default DocumentDetail;