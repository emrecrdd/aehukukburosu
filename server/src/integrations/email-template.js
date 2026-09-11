const escapeHtml = (value) => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const normalizeUrl = (value) => {
  const url = String(value ?? '').trim();

  if (!url) {
    return null;
  }

  if (!/^https?:\/\//i.test(url)) {
    return null;
  }

  return url;
};

const DEFAULT_LOGO_URL =
  normalizeUrl(
    process.env.EMAIL_LOGO_URL
  ) || null;

const DEFAULT_FOOTER =
  'Bu e-posta Derkenar Hukuk Bürosu Yönetim Sistemi tarafından otomatik olarak gönderilmiştir.';

const renderLogo = (logoUrl) => {
  const safeLogoUrl =
    normalizeUrl(
      logoUrl ||
      DEFAULT_LOGO_URL
    );

  if (!safeLogoUrl) {
    return `
      <div
        style="
          font-size:19px;
          line-height:1;
          font-weight:800;
          letter-spacing:.08em;
          color:#ffffff;
        "
      >
        DERKENAR
      </div>
    `;
  }

  return `
    <img
      src="${escapeHtml(safeLogoUrl)}"
      width="152"
      alt="Derkenar"
      style="
        display:block;
        width:152px;
        max-width:152px;
        height:auto;
        border:0;
        outline:none;
        text-decoration:none;
      "
    >
  `;
};

const renderButton = ({
  label,
  url,
}) => {
  const safeUrl =
    normalizeUrl(url);

  if (
    !safeUrl ||
    !String(label ?? '').trim()
  ) {
    return '';
  }

  return `
    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        margin:26px 0 6px;
        border-collapse:separate;
      "
    >
      <tr>
        <td
          align="center"
          bgcolor="#1d4ed8"
          style="
            border-radius:10px;
          "
        >
          <a
            href="${escapeHtml(safeUrl)}"
            style="
              display:inline-block;
              padding:13px 22px;
              font-family:Arial,Helvetica,sans-serif;
              font-size:14px;
              line-height:20px;
              font-weight:700;
              color:#ffffff;
              text-decoration:none;
              border-radius:10px;
            "
          >
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
};

const renderDetails = (
  items = []
) => {
  const validItems =
    items.filter(
      (item) =>
        item &&
        item.label &&
        item.value !== undefined &&
        item.value !== null &&
        String(item.value).trim()
    );

  if (
    validItems.length === 0
  ) {
    return '';
  }

  const rows =
    validItems
      .map(
        (
          item,
          index
        ) => `
          <tr>
            <td
              style="
                width:34%;
                padding:11px 12px;
                border-top:${
                  index === 0
                    ? '0'
                    : '1px solid #e5e7eb'
                };
                color:#64748b;
                font-size:13px;
                line-height:19px;
                font-weight:600;
                vertical-align:top;
                background:#f8fafc;
              "
            >
              ${escapeHtml(item.label)}
            </td>

            <td
              style="
                padding:11px 12px;
                border-top:${
                  index === 0
                    ? '0'
                    : '1px solid #e5e7eb'
                };
                color:#0f172a;
                font-size:13px;
                line-height:19px;
                font-weight:500;
                vertical-align:top;
                background:#ffffff;
              "
            >
              ${escapeHtml(item.value)}
            </td>
          </tr>
        `
      )
      .join('');

  return `
    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      border="0"
      width="100%"
      style="
        width:100%;
        margin:22px 0 4px;
        border:1px solid #e5e7eb;
        border-radius:10px;
        border-collapse:separate;
        border-spacing:0;
        overflow:hidden;
      "
    >
      ${rows}
    </table>
  `;
};

const renderWarning = (
  warning
) => {
  if (!warning) {
    return '';
  }

  return `
    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      border="0"
      width="100%"
      style="
        width:100%;
        margin:20px 0 4px;
        border-collapse:separate;
      "
    >
      <tr>
        <td
          style="
            padding:14px 16px;
            border:1px solid #fde68a;
            border-radius:10px;
            background:#fffbeb;
            color:#92400e;
            font-size:13px;
            line-height:20px;
          "
        >
          <strong>Bilgilendirme:</strong>
          ${escapeHtml(warning)}
        </td>
      </tr>
    </table>
  `;
};

const renderParagraphs = (
  paragraphs = []
) => {
  return paragraphs
    .filter(Boolean)
    .map(
      (paragraph) => `
        <p
          style="
            margin:0 0 15px;
            color:#334155;
            font-size:15px;
            line-height:24px;
          "
        >
          ${escapeHtml(paragraph)}
        </p>
      `
    )
    .join('');
};

export const createEmailTemplate = ({
  title,
  greeting,
  paragraphs = [],
  details = [],
  button,
  warning,
  footer,
  logoUrl = null,
  preheader = null,
}) => {
  const safeTitle =
    escapeHtml(
      title ||
      'Derkenar'
    );

  const safePreheader =
    escapeHtml(
      preheader ||
      title ||
      'Derkenar bildirimi'
    );

  return `
    <!doctype html>

    <html lang="tr">
      <head>
        <meta charset="utf-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        >

        <meta
          name="x-apple-disable-message-reformatting"
        >

        <title>${safeTitle}</title>
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f1f5f9;
          font-family:Arial,Helvetica,sans-serif;
          color:#0f172a;
          -webkit-text-size-adjust:100%;
          -ms-text-size-adjust:100%;
        "
      >
        <div
          style="
            display:none;
            max-height:0;
            overflow:hidden;
            opacity:0;
            color:transparent;
          "
        >
          ${safePreheader}
        </div>

        <table
          role="presentation"
          cellpadding="0"
          cellspacing="0"
          border="0"
          width="100%"
          style="
            width:100%;
            background:#f1f5f9;
            border-collapse:collapse;
          "
        >
          <tr>
            <td
              align="center"
              style="
                padding:32px 16px;
              "
            >
              <table
                role="presentation"
                cellpadding="0"
                cellspacing="0"
                border="0"
                width="640"
                style="
                  width:100%;
                  max-width:640px;
                  border-collapse:separate;
                  border-spacing:0;
                  background:#ffffff;
                  border:1px solid #e2e8f0;
                  border-radius:16px;
                  overflow:hidden;
                  box-shadow:0 8px 30px rgba(15,23,42,.06);
                "
              >
                <tr>
                  <td
                    style="
                      padding:24px 28px;
                      background:#0f172a;
                    "
                  >
                    <table
                      role="presentation"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      width="100%"
                      style="
                        width:100%;
                        border-collapse:collapse;
                      "
                    >
                      <tr>
                        <td
                          valign="middle"
                          style="
                            vertical-align:middle;
                          "
                        >
                          ${renderLogo(
                            logoUrl
                          )}
                        </td>

                        <td
                          align="right"
                          valign="middle"
                          style="
                            color:#94a3b8;
                            font-size:11px;
                            line-height:16px;
                            letter-spacing:.08em;
                            text-transform:uppercase;
                            vertical-align:middle;
                          "
                        >
                          Hukuk Bürosu Yönetim Sistemi
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      height:4px;
                      background:#2563eb;
                      font-size:0;
                      line-height:0;
                    "
                  >
                    &nbsp;
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:34px 30px 30px;
                    "
                  >
                    <p
                      style="
                        margin:0 0 8px;
                        color:#2563eb;
                        font-size:12px;
                        line-height:18px;
                        font-weight:700;
                        letter-spacing:.08em;
                        text-transform:uppercase;
                      "
                    >
                      Derkenar Bildirimi
                    </p>

                    <h1
                      style="
                        margin:0 0 22px;
                        color:#0f172a;
                        font-size:24px;
                        line-height:32px;
                        font-weight:800;
                        letter-spacing:-.02em;
                      "
                    >
                      ${safeTitle}
                    </h1>

                    ${
                      greeting
                        ? `
                          <p
                            style="
                              margin:0 0 18px;
                              color:#0f172a;
                              font-size:15px;
                              line-height:23px;
                              font-weight:700;
                            "
                          >
                            ${escapeHtml(
                              greeting
                            )}
                          </p>
                        `
                        : ''
                    }

                    ${renderParagraphs(
                      paragraphs
                    )}

                    ${renderDetails(
                      details
                    )}

                    ${renderWarning(
                      warning
                    )}

                    ${
                      button
                        ? renderButton(
                            button
                          )
                        : ''
                    }

                    <table
                      role="presentation"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      width="100%"
                      style="
                        width:100%;
                        margin-top:30px;
                        border-collapse:collapse;
                      "
                    >
                      <tr>
                        <td
                          style="
                            padding-top:18px;
                            border-top:1px solid #e2e8f0;
                            color:#64748b;
                            font-size:12px;
                            line-height:19px;
                          "
                        >
                          ${escapeHtml(
                            footer ||
                            DEFAULT_FOOTER
                          )}
                        </td>
                      </tr>
                    </table>

                    <p
                      style="
                        margin:14px 0 0;
                        color:#94a3b8;
                        font-size:11px;
                        line-height:17px;
                      "
                    >
                      Güvenliğiniz için hesap şifrenizi veya doğrulama kodlarınızı
                      e-posta yoluyla paylaşmayın.
                    </p>
                  </td>
                </tr>
              </table>

              <p
                style="
                  margin:16px 0 0;
                  color:#94a3b8;
                  font-size:11px;
                  line-height:17px;
                  text-align:center;
                "
              >
                © ${new Date().getFullYear()} Derkenar
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export const createPlainTextEmail = ({
  title,
  greeting,
  paragraphs = [],
  details = [],
  button,
  warning,
  footer,
}) => {
  const lines = [];

  if (title) {
    lines.push(
      title,
      ''
    );
  }

  if (greeting) {
    lines.push(
      greeting,
      ''
    );
  }

  for (
    const paragraph
    of paragraphs
  ) {
    if (paragraph) {
      lines.push(
        String(paragraph),
        ''
      );
    }
  }

  const validDetails =
    details.filter(
      (item) =>
        item?.label &&
        item?.value !== undefined &&
        item?.value !== null &&
        String(item.value).trim()
    );

  for (
    const item
    of validDetails
  ) {
    lines.push(
      `${item.label}: ${item.value}`
    );
  }

  if (
    validDetails.length >
    0
  ) {
    lines.push('');
  }

  if (warning) {
    lines.push(
      `Bilgilendirme: ${warning}`,
      ''
    );
  }

  const safeButtonUrl =
    normalizeUrl(
      button?.url
    );

  if (safeButtonUrl) {
    lines.push(
      `${button.label || 'Detayları görüntüle'}:`,
      safeButtonUrl,
      ''
    );
  }

  lines.push(
    footer ||
    DEFAULT_FOOTER
  );

  lines.push(
    '',
    'Güvenliğiniz için hesap şifrenizi veya doğrulama kodlarınızı e-posta yoluyla paylaşmayın.'
  );

  return lines
    .join('\n')
    .trim();
};
