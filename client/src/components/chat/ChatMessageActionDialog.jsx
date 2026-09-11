import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  Pencil,
  Save,
  Trash2,
} from 'lucide-react';

import Button from '../ui/Button.jsx';

const MAX_MESSAGE_LENGTH =
  10_000;

const getMessagePreview = (
  message
) => {
  const content =
    String(
      message?.content ||
      ''
    ).trim();

  if (content) {
    return content.length >
      180
      ? `${content.slice(
          0,
          180
        )}…`
      : content;
  }

  const attachments =
    Array.isArray(
      message?.attachments
    )
      ? message.attachments
      : [];

  if (
    attachments.length >
    0
  ) {
    const names =
      attachments
        .map(
          (
            attachment
          ) =>
            attachment
              ?.original_name
        )
        .filter(Boolean);

    if (
      names.length >
      0
    ) {
      return names.join(
        ', '
      );
    }

    return `${attachments.length} dosya`;
  }

  return 'Mesaj içeriği';
};

const ChatMessageActionDialog = ({
  open,
  mode,
  message,
  pending = false,
  onClose,
  onConfirm,
}) => {
  const [
    editContent,
    setEditContent,
  ] =
    useState('');

  const isEdit =
    mode ===
    'edit';

  const isDelete =
    mode ===
    'delete';

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      setEditContent(
        String(
          message?.content ||
          ''
        )
      );
    },
    [
      open,
      message?.id,
      message?.content,
    ]
  );

  useEffect(
    () => {
      if (
        !open
      ) {
        return undefined;
      }

      const previousOverflow =
        document.body.style
          .overflow;

      document.body.style.overflow =
        'hidden';

      const handleKeyDown =
        (
          event
        ) => {
          if (
            event.key ===
              'Escape' &&
            !pending
          ) {
            onClose?.();
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

        document.body.style.overflow =
          previousOverflow;
      };
    },
    [
      open,
      pending,
      onClose,
    ]
  );

  const normalizedContent =
    editContent.trim();

  const originalContent =
    String(
      message?.content ||
      ''
    ).trim();

  const canSave =
    isEdit &&
    normalizedContent.length >
      0 &&
    normalizedContent.length <=
      MAX_MESSAGE_LENGTH &&
    normalizedContent !==
      originalContent &&
    !pending;

  const preview =
    useMemo(
      () =>
        getMessagePreview(
          message
        ),
      [
        message,
      ]
    );

  if (
    !open ||
    !message ||
    (
      !isEdit &&
      !isDelete
    )
  ) {
    return null;
  }

  const handleBackdrop =
    () => {
      if (
        pending
      ) {
        return;
      }

      onClose?.();
    };

  const handleConfirm =
    () => {
      if (
        pending
      ) {
        return;
      }

      if (
        isEdit
      ) {
        if (
          !canSave
        ) {
          return;
        }

        onConfirm?.(
          normalizedContent
        );

        return;
      }

      onConfirm?.();
    };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
        aria-label={
          isEdit
            ? 'Mesaj düzenleme penceresini kapat'
            : 'Mesaj silme penceresini kapat'
        }
        disabled={
          pending
        }
        onClick={
          handleBackdrop
        }
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-message-action-dialog-title"
        aria-describedby="chat-message-action-dialog-description"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
      >
        <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">
          <div className="flex items-start gap-4">
            <div
              className={`
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-xl
                ${
                  isEdit
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/[0.10] dark:text-blue-400'
                    : 'bg-red-50 text-red-600 dark:bg-red-500/[0.10] dark:text-red-400'
                }
              `}
            >
              {isEdit ? (
                <Pencil className="h-5 w-5" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                {isEdit
                  ? 'Mesaj güncelleme'
                  : 'Mesaj silme onayı'}
              </p>

              <h2
                id="chat-message-action-dialog-title"
                className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
              >
                {isEdit
                  ? 'Mesajı düzenle'
                  : 'Mesajı sil'}
              </h2>

              <p
                id="chat-message-action-dialog-description"
                className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
              >
                {isEdit
                  ? 'Mesaj içeriğini güncelleyin ve değişiklikleri kaydedin.'
                  : 'Seçili mesaj için silme işlemini onaylayın.'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {isEdit ? (
            <>
              <div>
                <label
                  htmlFor="chat-message-edit-content"
                  className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200"
                >
                  Mesaj içeriği
                </label>

                <textarea
                  id="chat-message-edit-content"
                  value={
                    editContent
                  }
                  onChange={(
                    event
                  ) => {
                    const value =
                      event.target.value;

                    if (
                      value.length <=
                      MAX_MESSAGE_LENGTH
                    ) {
                      setEditContent(
                        value
                      );
                    }
                  }}
                  disabled={
                    pending
                  }
                  autoFocus
                  rows={6}
                  className="
                    min-h-[140px] w-full resize-y
                    rounded-xl border border-gray-200
                    bg-gray-50/70 px-3.5 py-3
                    text-sm leading-6 text-gray-900
                    outline-none transition
                    placeholder:text-gray-400
                    focus:border-blue-300
                    focus:bg-white
                    focus:ring-2
                    focus:ring-blue-100
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-100
                    dark:focus:border-blue-400/30
                    dark:focus:bg-white/[0.055]
                    dark:focus:ring-blue-500/10
                  "
                />

                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    Mesaj geçmişinde güncellenmiş olarak işaretlenir.
                  </p>

                  <span className="shrink-0 text-xs font-medium text-gray-400 dark:text-slate-500">
                    {editContent.length}/
                    {MAX_MESSAGE_LENGTH}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/[0.07]">
                <div className="flex items-start gap-3">
                  <Pencil className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

                  <div>
                    <p className="text-sm font-semibold text-blue-950 dark:text-blue-200">
                      Mesaj içeriği güncellenecek
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-900/80 dark:text-blue-200/80">
                      Yalnızca mesaj metni değişir. Sohbetin alıcısı, gönderim zamanı ve erişim kuralları değişmez.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-500/20 dark:bg-red-500/[0.07]">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

                  <div>
                    <p className="text-sm font-semibold text-red-950 dark:text-red-200">
                      Mesaj sohbetten kaldırılacak
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-900/80 dark:text-red-200/80">
                      {message?.type ===
                      'file'
                        ? 'Mesaj ve mesaja bağlı dosyalar kaldırılacaktır. Bu işlem kullanıcı arayüzünden geri alınamaz.'
                        : 'Seçili mesaj silinmiş olarak işaretlenecek ve içerik artık sohbet akışında görüntülenmeyecektir.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">
                <p className="text-xs font-semibold uppercase tracking-[0.10em] text-gray-400 dark:text-slate-500">
                  Seçili mesaj
                </p>

                <p className="mt-2 break-words text-sm leading-6 text-gray-700 dark:text-slate-300">
                  {preview}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.015] sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={
              pending
            }
            onClick={
              onClose
            }
          >
            Vazgeç
          </Button>

          <Button
            type="button"
            variant={
              isEdit
                ? 'primary'
                : 'danger'
            }
            loading={
              pending
            }
            disabled={
              isEdit
                ? !canSave
                : pending
            }
            onClick={
              handleConfirm
            }
          >
            {isEdit ? (
              <>
                <Save className="h-4 w-4" />
                Değişiklikleri Kaydet
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Mesajı Sil
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatMessageActionDialog;
