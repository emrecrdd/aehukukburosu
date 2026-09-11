import path from 'path';

import {
  Conversation,
  ConversationMember,
  Message,
  MessageAttachment,
  User,
} from '../../models/index.js';

import {
  chatStorage,
} from './chat.storage.js';

import {
  logger,
} from '../../config/logger.js';

import {
  assertConversationAccess,
} from './chat.service.js';

const MAX_CAPTION_LENGTH =
  10_000;

const DOWNLOAD_URL_EXPIRY_SECONDS =
  10 * 60;


const PDF_SIGNATURE =
  Buffer.from(
    '%PDF-',
    'ascii'
  );

const OLE_SIGNATURE =
  Buffer.from([
    0xd0,
    0xcf,
    0x11,
    0xe0,
    0xa1,
    0xb1,
    0x1a,
    0xe1,
  ]);

const JPEG_SIGNATURE =
  Buffer.from([
    0xff,
    0xd8,
    0xff,
  ]);

const PNG_SIGNATURE =
  Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
  ]);

const RIFF_SIGNATURE =
  Buffer.from(
    'RIFF',
    'ascii'
  );

const WEBP_SIGNATURE =
  Buffer.from(
    'WEBP',
    'ascii'
  );

const ZIP_SIGNATURES = [
  Buffer.from([
    0x50,
    0x4b,
    0x03,
    0x04,
  ]),

  Buffer.from([
    0x50,
    0x4b,
    0x05,
    0x06,
  ]),

  Buffer.from([
    0x50,
    0x4b,
    0x07,
    0x08,
  ]),
];

const startsWithSignature = (
  buffer,
  signature
) => (
  Buffer.isBuffer(
    buffer
  ) &&
  buffer.length >=
    signature.length &&
  buffer
    .subarray(
      0,
      signature.length
    )
    .equals(
      signature
    )
);

const hasZipSignature = (
  buffer
) =>
  ZIP_SIGNATURES.some(
    (
      signature
    ) =>
      startsWithSignature(
        buffer,
        signature
      )
  );

const containsAscii = (
  buffer,
  value
) => (
  Buffer.isBuffer(
    buffer
  ) &&
  buffer.includes(
    Buffer.from(
      value,
      'utf8'
    )
  )
);

const isWebp = (
  buffer
) => (
  Buffer.isBuffer(
    buffer
  ) &&
  buffer.length >=
    12 &&
  buffer
    .subarray(
      0,
      4
    )
    .equals(
      RIFF_SIGNATURE
    ) &&
  buffer
    .subarray(
      8,
      12
    )
    .equals(
      WEBP_SIGNATURE
    )
);

const containsUtf16Le = (
  buffer,
  value
) => (
  Buffer.isBuffer(
    buffer
  ) &&
  buffer.includes(
    Buffer.from(
      value,
      'utf16le'
    )
  )
);

const getFileExtension = (
  file
) =>
  path
    .extname(
      file?.originalname ||
      ''
    )
    .toLowerCase();

const normalizeOriginalName = (
  value,
  fallback =
    'dosya'
) => {
  const normalized =
    String(
      value ||
      fallback
    )
      .replace(
        /\\/g,
        '/'
      )
      .replace(
        /[\u0000-\u001f\u007f]/g,
        ''
      );

  return (
    path.posix.basename(
      normalized
    )
      .slice(
        0,
        255
      ) ||
    fallback
  );
};

const assertFileContent = (
  file
) => {
  if (
    !file ||
    !Buffer.isBuffer(
      file.buffer
    ) ||
    file.buffer.length ===
      0
  ) {
    throw createChatError(
      'Dosya içeriği okunamadı.',
      400,
      'CHAT_INVALID_FILE_CONTENT'
    );
  }

  const extension =
    getFileExtension(
      file
    );

  let valid =
    false;

  if (
    extension ===
    '.pdf'
  ) {
    valid =
      startsWithSignature(
        file.buffer,
        PDF_SIGNATURE
      );
  }

  if (
    extension ===
    '.doc'
  ) {
    valid =
      startsWithSignature(
        file.buffer,
        OLE_SIGNATURE
      );
  }

  if (
    extension ===
    '.docx'
  ) {
    valid =
      hasZipSignature(
        file.buffer
      ) &&
      containsAscii(
        file.buffer,
        '[Content_Types].xml'
      ) &&
      containsAscii(
        file.buffer,
        'word/'
      );
  }

  if (
    extension ===
    '.xls'
  ) {
    /*
     * Eski XLS BIFF dosyaları OLE Compound File konteyneridir.
     * Sadece OLE imzasına güvenmeyip Excel workbook stream adını da arıyoruz.
     */
    valid =
      startsWithSignature(
        file.buffer,
        OLE_SIGNATURE
      ) &&
      (
        containsUtf16Le(
          file.buffer,
          'Workbook'
        ) ||
        containsUtf16Le(
          file.buffer,
          'Book'
        ) ||
        containsAscii(
          file.buffer,
          'Workbook'
        )
      );
  }

  if (
    extension ===
    '.xlsx'
  ) {
    valid =
      hasZipSignature(
        file.buffer
      ) &&
      containsAscii(
        file.buffer,
        '[Content_Types].xml'
      ) &&
      containsAscii(
        file.buffer,
        'xl/'
      );
  }

  if (
    extension ===
      '.jpg' ||
    extension ===
      '.jpeg'
  ) {
    valid =
      startsWithSignature(
        file.buffer,
        JPEG_SIGNATURE
      );
  }

  if (
    extension ===
    '.png'
  ) {
    valid =
      startsWithSignature(
        file.buffer,
        PNG_SIGNATURE
      );
  }

  if (
    extension ===
    '.webp'
  ) {
    valid =
      isWebp(
        file.buffer
      );
  }

  if (
    extension ===
    '.udf'
  ) {
    /*
     * Mevcut UDF görüntüleyici hem ZIP konteynerli UDF
     * hem de raw XML UDF kabul ediyor. Chat doğrulaması
     * aynı formatları destekler.
     */
    const beginning =
      file.buffer
        .subarray(
          0,
          Math.min(
            file.buffer.length,
            512
          )
        )
        .toString(
          'utf8'
        )
        .replace(
          /^\uFEFF/,
          ''
        )
        .trimStart();

    const rawXmlUdf =
      beginning.startsWith(
        '<?xml'
      ) ||
      beginning.startsWith(
        '<template'
      );

    const zipUdf =
      hasZipSignature(
        file.buffer
      ) &&
      containsAscii(
        file.buffer,
        'content.xml'
      );

    valid =
      rawXmlUdf ||
      zipUdf;
  }

  if (!valid) {
    throw createChatError(
      'Dosya uzantısı doğru görünse de dosya içeriği beklenen formatla uyuşmuyor.',
      400,
      'CHAT_INVALID_FILE_CONTENT'
    );
  }
};

const createChatError = (
  message,
  statusCode = 400,
  code = 'CHAT_ERROR'
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    code;

  return error;
};

const isUuid = (
  value
) => (
  typeof value ===
    'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  )
);

const normalizeOptionalCaption = (
  value
) => {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return null;
  }

  if (
    typeof value !==
    'string'
  ) {
    throw createChatError(
      'Mesaj açıklaması geçersiz.',
      400,
      'CHAT_INVALID_CAPTION'
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  if (
    normalized.length >
    MAX_CAPTION_LENGTH
  ) {
    throw createChatError(
      `Mesaj açıklaması en fazla ${MAX_CAPTION_LENGTH} karakter olabilir.`,
      400,
      'CHAT_CAPTION_TOO_LONG'
    );
  }

  return normalized;
};

const serializeUser = (
  user
) => {
  if (!user) {
    return null;
  }

  return {
    id:
      user.id,

    first_name:
      user.first_name,

    last_name:
      user.last_name,

    title:
      user.title ??
      null,

    avatar:
      user.avatar ??
      null,

    is_active:
      user.is_active ===
      true,
  };
};

const serializeAttachment = (
  attachment
) => ({
  id:
    attachment.id,

  original_name:
    attachment.original_name,

  mime_type:
    attachment.mime_type,

  file_size:
    Number(
      attachment.file_size
    ),

  extension:
    attachment.extension,
});

const serializeMessage = (
  message
) => ({
  id:
    message.id,

  conversation_id:
    message.conversation_id,

  sender:
    serializeUser(
      message.sender
    ),

  type:
    message.type,

  content:
    message.content,

  attachments: (
    message.attachments ||
    []
  ).map(
    serializeAttachment
  ),

  is_deleted:
    false,

  edited_at:
    message.edited_at,

  created_at:
    message.created_at,

  updated_at:
    message.updated_at,

  deleted_at:
    null,
});

const messageIncludes = [
  {
    model:
      User,

    as:
      'sender',

    attributes: [
      'id',
      'first_name',
      'last_name',
      'title',
      'avatar',
      'is_active',
    ],
  },
  {
    model:
      MessageAttachment,

    as:
      'attachments',

    required:
      false,
  },
];

const assertDirectRecipientActive =
  async (
    conversation,
    actorId,
    transaction = null
  ) => {
    if (
      conversation.type !==
      'direct'
    ) {
      return;
    }

    const members =
      await ConversationMember.findAll({
        where: {
          conversation_id:
            conversation.id,
        },

        include: [
          {
            model:
              User,

            as:
              'user',

            attributes: [
              'id',
              'is_active',
            ],
          },
        ],

        transaction,
      });

    const otherMember =
      members.find(
        (member) =>
          member.user_id !==
          actorId
      );

    if (
      !otherMember?.user ||
      otherMember.user.is_active !==
        true
    ) {
      throw createChatError(
        'Bu kullanıcı artık aktif olmadığı için yeni mesaj gönderilemez.',
        409,
        'CHAT_RECIPIENT_INACTIVE'
      );
    }
  };

const cleanupUploadedObjects =
  async (
    uploadedObjects
  ) => {
    for (
      const uploaded
      of uploadedObjects
    ) {
      try {
        await chatStorage.deleteFile(
          uploaded.key
        );
      } catch (
        cleanupError
      ) {
        logger.error(
          'Chat attachment rollback cleanup başarısız',
          {
            storageKey:
              uploaded.key,

            message:
              cleanupError?.message,
          }
        );
      }
    }
  };

export const chatAttachmentService = {
  async sendFiles(
    conversationId,
    actor,
    files,
    caption = null
  ) {
    if (
      !Array.isArray(files) ||
      files.length === 0
    ) {
      throw createChatError(
        'Gönderilecek dosya bulunamadı.',
        400,
        'CHAT_FILE_REQUIRED'
      );
    }

    const normalizedCaption =
      normalizeOptionalCaption(
        caption
      );

    /*
     * Upload başlamadan önce access kontrolü yapılır.
     */
    const {
      conversation,
    } =
      await assertConversationAccess(
        conversationId,
        actor
      );

    await assertDirectRecipientActive(
      conversation,
      actor.id
    );

    files.forEach(
      assertFileContent
    );

    const uploadedObjects =
      [];

    try {
      for (
        const file
        of files
      ) {
        const uploaded =
          await chatStorage.uploadFile(
            file,
            conversation.id
          );

        uploadedObjects.push(
          uploaded
        );
      }

      const sequelize =
        Conversation.sequelize;

      const result =
        await sequelize.transaction(
          async (
            transaction
          ) => {
            /*
             * Upload sırasında üyelik/pasiflik değişmiş olabilir;
             * DB kaydından hemen önce tekrar doğrulanır.
             */
            const {
              conversation:
                currentConversation,
            } =
              await assertConversationAccess(
                conversation.id,
                actor,
                {
                  transaction,
                }
              );

            await assertDirectRecipientActive(
              currentConversation,
              actor.id,
              transaction
            );

            const message =
              await Message.create(
                {
                  conversation_id:
                    currentConversation.id,

                  sender_id:
                    actor.id,

                  type:
                    'file',

                  content:
                    normalizedCaption,
                },
                {
                  transaction,
                }
              );

            const attachmentRows =
              uploadedObjects.map(
                (
                  uploaded,
                  index
                ) => {
                  const sourceFile =
                    files[index];

                  const extension =
                    path
                      .extname(
                        sourceFile.originalname ||
                        ''
                      )
                      .toLowerCase();

                  return {
                    message_id:
                      message.id,

                    storage_key:
                      uploaded.key,

                    original_name:
                      normalizeOriginalName(
                        sourceFile.originalname,
                        `dosya${extension}`
                      ),

                    mime_type:
                      sourceFile.mimetype ||
                      'application/octet-stream',

                    file_size:
                      sourceFile.size,

                    extension:
                      extension ||
                      '.bin',
                  };
                }
              );

            await MessageAttachment.bulkCreate(
              attachmentRows,
              {
                transaction,
              }
            );

            /*
             * Birebir sohbet taraflardan biri tarafından listeden
             * gizlenmişse yeni dosya mesajı sohbeti tekrar görünür yapar.
             */
            if (
              currentConversation.type ===
              'direct'
            ) {
              await ConversationMember.update(
                {
                  hidden_at:
                    null,
                },
                {
                  where: {
                    conversation_id:
                      currentConversation.id,
                  },

                  transaction,
                }
              );
            }

            await ConversationMember.update(
              {
                last_read_message_id:
                  message.id,
              },
              {
                where: {
                  conversation_id:
                    currentConversation.id,

                  user_id:
                    actor.id,
                },

                transaction,
              }
            );

            const hydrated =
              await Message.findByPk(
                message.id,
                {
                  include:
                    messageIncludes,

                  transaction,
                }
              );

            return serializeMessage(
              hydrated
            );
          }
        );

      return result;
    } catch (
      error
    ) {
      await cleanupUploadedObjects(
        uploadedObjects
      );

      throw error;
    }
  },

  async getDownloadUrl(
    attachmentId,
    actor
  ) {
    if (
      !isUuid(
        attachmentId
      )
    ) {
      throw createChatError(
        'Dosya bulunamadı.',
        404,
        'CHAT_ATTACHMENT_NOT_FOUND'
      );
    }

    const attachment =
      await MessageAttachment.findByPk(
        attachmentId,
        {
          include: [
            {
              model:
                Message,

              as:
                'message',

              required:
                true,

              paranoid:
                false,

              attributes: [
                'id',
                'conversation_id',
                'deleted_at',
              ],
            },
          ],
        }
      );

    if (
      !attachment ||
      !attachment.message ||
      attachment.message.deleted_at
    ) {
      throw createChatError(
        'Dosya bulunamadı.',
        404,
        'CHAT_ATTACHMENT_NOT_FOUND'
      );
    }

    await assertConversationAccess(
      attachment.message
        .conversation_id,
      actor
    );

    const url =
      await chatStorage.getSignedDownloadUrl(
        {
          key:
            attachment.storage_key,

          originalName:
            attachment.original_name,

          mimeType:
            attachment.mime_type,

          expiresIn:
            DOWNLOAD_URL_EXPIRY_SECONDS,
        }
      );

    return {
      id:
        attachment.id,

      original_name:
        attachment.original_name,

      mime_type:
        attachment.mime_type,

      file_size:
        Number(
          attachment.file_size
        ),

      extension:
        attachment.extension,

      url,

      expires_in:
        DOWNLOAD_URL_EXPIRY_SECONDS,
    };
  },
};

export default chatAttachmentService;
