import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  FileText,
  Paperclip,
  Send,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

const MAX_MESSAGE_LENGTH =
  10_000;

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const MAX_FILES =
  3;

const ALLOWED_EXTENSIONS =
  new Set([
    '.pdf',
    '.doc',
    '.docx',
    '.udf',
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.xls',
    '.xlsx',
  ]);

const getExtension = (
  fileName = ''
) => {
  const index =
    fileName.lastIndexOf(
      '.'
    );

  if (
    index < 0
  ) {
    return '';
  }

  return fileName
    .slice(
      index
    )
    .toLowerCase();
};

const formatFileSize = (
  bytes
) => {
  const value =
    Number(
      bytes
    );

  if (
    !Number.isFinite(
      value
    )
  ) {
    return '';
  }

  if (
    value <
    1024
  ) {
    return `${value} B`;
  }

  if (
    value <
    1024 * 1024
  ) {
    return `${(
      value /
      1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value /
    1024 /
    1024
  ).toFixed(1)} MB`;
};

const MessageInput = ({
  disabled,
  sending,
  onSend,
  onSendFiles,
  onTyping,
  attachmentsEnabled = false,
}) => {
  const [
    value,
    setValue,
  ] =
    useState('');

  const [
    selectedFiles,
    setSelectedFiles,
  ] =
    useState([]);

  const typingTimerRef =
    useRef(null);

  const fileInputRef =
    useRef(null);

  useEffect(
    () => () => {
      if (
        typingTimerRef.current
      ) {
        clearTimeout(
          typingTimerRef.current
        );
      }

      onTyping?.(
        false
      );
    },
    [
      onTyping,
    ]
  );

  const stopTypingLater =
    () => {
      if (
        typingTimerRef.current
      ) {
        clearTimeout(
          typingTimerRef.current
        );
      }

      typingTimerRef.current =
        setTimeout(
          () => {
            onTyping?.(
              false
            );
          },
          1200
        );
    };

  const handleChange =
    (
      event
    ) => {
      const nextValue =
        event.target.value;

      if (
        nextValue.length >
        MAX_MESSAGE_LENGTH
      ) {
        return;
      }

      setValue(
        nextValue
      );

      onTyping?.(
        Boolean(
          nextValue.trim()
        )
      );

      stopTypingLater();
    };

  const handleFileChange =
    (
      event
    ) => {
      const incoming =
        Array.from(
          event.target.files ||
          []
        );

      /*
       * Aynı dosyayı tekrar seçebilmek için input value sıfırlanır.
       */
      event.target.value =
        '';

      if (
        incoming.length ===
        0
      ) {
        return;
      }

      const nextFiles = [
        ...selectedFiles,
      ];

      for (
        const file
        of incoming
      ) {
        if (
          nextFiles.length >=
          MAX_FILES
        ) {
          toast.error(
            `Bir mesajda en fazla ${MAX_FILES} dosya gönderebilirsin.`
          );

          break;
        }

        const extension =
          getExtension(
            file.name
          );

        if (
          !ALLOWED_EXTENSIONS.has(
            extension
          )
        ) {
          toast.error(
            `${file.name}: yalnızca PDF, Word, Excel, UDF ve JPG/JPEG/PNG/WEBP dosyaları gönderilebilir.`
          );

          continue;
        }

        if (
          file.size >
          MAX_FILE_SIZE
        ) {
          toast.error(
            `${file.name}: dosya en fazla 10 MB olabilir.`
          );

          continue;
        }

        nextFiles.push(
          file
        );
      }

      setSelectedFiles(
        nextFiles
      );
    };

  const removeFile =
    (
      index
    ) => {
      setSelectedFiles(
        (
          current
        ) =>
          current.filter(
            (
              _file,
              fileIndex
            ) =>
              fileIndex !==
              index
          )
      );
    };

  const submit =
    async () => {
      const content =
        value.trim();

      const hasFiles =
        selectedFiles.length >
        0;

      if (
        (
          !content &&
          !hasFiles
        ) ||
        disabled ||
        sending
      ) {
        return;
      }

      if (
        typingTimerRef.current
      ) {
        clearTimeout(
          typingTimerRef.current
        );
      }

      onTyping?.(
        false
      );

      if (
        hasFiles
      ) {
        const filesToSend = [
          ...selectedFiles,
        ];

        try {
          await onSendFiles?.(
            filesToSend,
            content
          );

          setValue(
            ''
          );

          setSelectedFiles(
            []
          );
        } catch {
          /*
           * Mutation toast/error akışını yönetir.
           * Caption ve seçili dosyalar kullanıcıda kalır.
           */
        }

        return;
      }

      setValue(
        ''
      );

      try {
        await onSend(
          content
        );
      } catch {
        /*
         * Mutation kendi toast/error akışını yönetiyor.
         * Kullanıcı metni kaybetmesin.
         */
        setValue(
          content
        );
      }
    };

  const handleKeyDown =
    (
      event
    ) => {
      if (
        event.key ===
          'Enter' &&
        !event.shiftKey
      ) {
        event.preventDefault();

        void submit();
      }
    };

  return (
    <div className="border-t border-slate-300/70 bg-[#f2f5f8]/95 p-3 shadow-[0_-10px_32px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/[0.06] dark:bg-[#09182c]/95">
      {selectedFiles.length >
        0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedFiles.map(
            (
              file,
              index
            ) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-2.5 py-2 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.04]"
              >
                <FileText
                  size={15}
                  className="shrink-0 text-gray-500 dark:text-slate-400"
                />

                <div className="min-w-0">
                  <p className="max-w-[220px] truncate text-[11px] font-semibold text-gray-700 dark:text-slate-200">
                    {file.name}
                  </p>

                  <p className="text-[9px] text-gray-400 dark:text-slate-500">
                    {formatFileSize(
                      file.size
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeFile(
                      index
                    )
                  }
                  disabled={
                    sending
                  }
                  className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-white/[0.08] dark:hover:text-white"
                  aria-label={`${file.name} dosyasını kaldır`}
                >
                  <X
                    size={13}
                  />
                </button>
              </div>
            )
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={
            fileInputRef
          }
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.udf,.xls,.xlsx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,image/webp"
          onChange={
            handleFileChange
          }
          className="hidden"
          tabIndex={-1}
        />

        <button
          type="button"
          onClick={() =>
            fileInputRef.current
              ?.click()
          }
          disabled={
            !attachmentsEnabled ||
            disabled ||
            sending ||
            selectedFiles.length >=
              MAX_FILES
          }
          className="
            relative inline-flex h-10 w-10 shrink-0
            items-center justify-center
            rounded-xl border border-gray-200
            text-gray-400 transition
            hover:bg-gray-50
            disabled:cursor-not-allowed
            disabled:opacity-40
            dark:border-white/[0.07]
            dark:text-slate-500
            dark:hover:bg-white/[0.05]
          "
          aria-label="Dosya ekle"
          title={
            attachmentsEnabled
              ? 'PDF, Word, Excel, UDF veya görsel ekle'
              : 'Dosya gönderimi kullanılamıyor'
          }
        >
          <Paperclip
            size={18}
          />

          {selectedFiles.length >
            0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
              {
                selectedFiles.length
              }
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <textarea
            value={
              value
            }
            onChange={
              handleChange
            }
            onKeyDown={
              handleKeyDown
            }
            disabled={
              disabled ||
              sending
            }
            rows={1}
            placeholder={
              selectedFiles.length >
                0
                ? 'Dosyaya açıklama ekle (isteğe bağlı)...'
                : 'Mesaj yaz...'
            }
            className="
              max-h-32 min-h-10 w-full
              resize-none rounded-xl
              border border-slate-200
              bg-white px-3 py-2.5
              text-sm leading-5
              text-slate-900 caret-[#102f59]
              outline-none transition
              placeholder:text-slate-400
              focus:border-amber-300
              focus:bg-white
              focus:ring-2
              focus:ring-amber-100
              disabled:cursor-not-allowed
              disabled:opacity-60
              dark:border-white/[0.07]
              dark:bg-white/[0.035]
              dark:text-slate-100
              dark:caret-amber-300
              dark:placeholder:text-slate-500
              dark:focus:border-amber-400/30
              dark:focus:bg-white/[0.055]
              dark:focus:ring-amber-500/10
            "
          />

          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[9px] text-gray-300 dark:text-slate-700">
              {selectedFiles.length >
                0
                ? `${selectedFiles.length}/${MAX_FILES} dosya`
                : ''}
            </span>

            <span className="text-[9px] font-medium text-gray-300 dark:text-slate-700">
              {value.length}/
              {MAX_MESSAGE_LENGTH}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void submit()
          }
          disabled={
            disabled ||
            sending ||
            (
              !value.trim() &&
              selectedFiles.length ===
                0
            )
          }
          className="
            inline-flex h-10 w-10 shrink-0
            items-center justify-center
            rounded-xl bg-[#102f59]
            text-white shadow-sm transition
            hover:bg-[#153d70]
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
          aria-label={
            selectedFiles.length >
              0
              ? 'Dosyaları gönder'
              : 'Mesaj gönder'
          }
        >
          <Send
            size={17}
          />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
