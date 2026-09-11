import {
  CheckCheck,
  Download,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';

const formatMessageTime = (
  value
) => {
  if (!value) {
    return '';
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleTimeString(
    'tr-TR',
    {
      hour:
        '2-digit',

      minute:
        '2-digit',
    }
  );
};

const formatFileSize = (
  value
) => {
  const bytes =
    Number(
      value
    );

  if (
    !Number.isFinite(
      bytes
    ) ||
    bytes <= 0
  ) {
    return '';
  }

  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
};

const MessageBubble = ({
  message,
  own,
  showSender,
  showReadReceipt,
  onEdit,
  onDelete,
  onDownloadAttachment,
}) => {
  const senderName =
    [
      message?.sender
        ?.first_name,
      message?.sender
        ?.last_name,
    ]
      .filter(Boolean)
      .join(' ');

  if (
    message
      ?.is_deleted
  ) {
    return (
      <div
        className={`
          flex
          ${
            own
              ? 'justify-end'
              : 'justify-start'
          }
        `}
      >
        <div className="max-w-[82%] rounded-2xl border border-dashed border-slate-300/80 bg-white/55 px-3.5 py-2.5 text-xs italic text-slate-400 backdrop-blur-sm dark:border-white/[0.08] dark:bg-white/[0.025] dark:text-slate-500 md:max-w-[70%]">
          Bu mesaj silindi
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        group flex
        ${
          own
            ? 'justify-end'
            : 'justify-start'
        }
      `}
    >
      <div className="max-w-[88%] md:max-w-[74%]">
        {showSender &&
          !own &&
          senderName && (
            <p className="mb-1 ml-1 text-[10px] font-bold tracking-wide text-[#52657d] dark:text-slate-500">
              {senderName}
            </p>
          )}

        <div
          className={`
            relative rounded-2xl px-3.5 py-2.5
            shadow-[0_5px_18px_rgba(15,23,42,0.07)]
            ${
              own
                ? 'rounded-br-md border border-[#183d68] bg-gradient-to-br from-[#102f59] to-[#173f70] text-white dark:border-blue-500/25 dark:from-[#12345f] dark:to-[#174a82]'
                : 'rounded-bl-md border border-slate-200/90 bg-white/95 text-slate-800 backdrop-blur-sm dark:border-white/[0.07] dark:bg-[#0d2039]/95 dark:text-slate-100'
            }
          `}
        >
          {message
            ?.content && (
            <p className="whitespace-pre-wrap break-words text-sm leading-6">
              {
                message.content
              }
            </p>
          )}

          {Array.isArray(
            message
              ?.attachments
          ) &&
            message
              .attachments
              .length >
              0 && (
              <div
                className={`
                  space-y-2
                  ${
                    message
                      .content
                      ? 'mt-2.5'
                      : ''
                  }
                `}
              >
                {message.attachments.map(
                  (
                    attachment
                  ) => (
                    <button
                      key={
                        attachment.id
                      }
                      type="button"
                      onClick={() =>
                        onDownloadAttachment?.(
                          attachment
                        )
                      }
                      className={`
                        flex w-full items-center gap-2
                        rounded-xl border px-3 py-2
                        text-left transition
                        ${
                          own
                            ? 'border-white/15 bg-white/[0.09] hover:bg-white/[0.14]'
                            : 'border-slate-200 bg-slate-50/90 hover:bg-slate-100 dark:border-white/[0.07] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]'
                        }
                      `}
                    >
                      <FileText
                        size={17}
                        className="shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">
                          {
                            attachment
                              .original_name
                          }
                        </p>

                        <p
                          className={`
                            mt-0.5 text-[9px]
                            ${
                              own
                                ? 'text-white/60'
                                : 'text-gray-400 dark:text-slate-500'
                            }
                          `}
                        >
                          {formatFileSize(
                            attachment
                              .file_size
                          )}
                        </p>
                      </div>

                      <Download
                        size={15}
                        className="shrink-0 opacity-70"
                      />
                    </button>
                  )
                )}
              </div>
            )}

          <div
            className={`
              mt-1.5 flex items-center justify-end gap-1.5
              text-[9px] font-medium
              ${
                own
                  ? 'text-white/60'
                  : 'text-gray-400 dark:text-slate-500'
              }
            `}
          >
            {message
              ?.edited_at && (
              <span>
                düzenlendi
              </span>
            )}

            <span>
              {formatMessageTime(
                message
                  ?.created_at
              )}
            </span>

            {showReadReceipt &&
              own && (
                <span className="inline-flex items-center gap-0.5">
                  <CheckCheck
                    size={12}
                  />
                  Okundu
                </span>
              )}
          </div>

          {own && (
            <div
              className="
                absolute -left-20 top-1/2
                hidden -translate-y-1/2
                items-center gap-1
                rounded-lg border
                border-gray-200 bg-white
                p-1 shadow-sm
                group-hover:flex
                dark:border-white/[0.08]
                dark:bg-[#0b1b33]
              "
            >
              {message.type ===
                'text' && (
                <button
                  type="button"
                  onClick={() =>
                    onEdit?.(
                      message
                    )
                  }
                  className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  aria-label="Mesajı düzenle"
                >
                  <Pencil
                    size={13}
                  />
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  onDelete?.(
                    message
                  )
                }
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-500/[0.08] dark:hover:text-red-400"
                aria-label="Mesajı sil"
              >
                <Trash2
                  size={13}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
