import {
  Op,
} from 'sequelize';

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import unzipper from 'unzipper';
import {
  fileURLToPath,
} from 'url';

import AdmZip from 'adm-zip';

import {
  XMLParser,
} from 'fast-xml-parser';

import {
  Template,
} from '../../models/Template.js';

import {
  User,
} from '../../models/User.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

import {
  s3Client,
  S3_BUCKET_NAME,
} from '../../config/s3.js';

// ======================================================
// PATHS
// ======================================================

const __filename =
  fileURLToPath(
    import.meta.url
  );

const __dirname =
  path.dirname(
    __filename
  );

const UPLOAD_DIR =
  path.resolve(
    __dirname,
    '../../../uploads'
  );

await fsPromises.mkdir(
  UPLOAD_DIR,
  {
    recursive:
      true,
  }
);

// ======================================================
// HELPERS
// ======================================================

const resolveTemplateFilePath = (
  fileUrl
) => {
  if (
    !fileUrl
  ) {
    throw new Error(
      'Template file not found'
    );
  }

  const filename =
    path.basename(
      fileUrl
    );

  const resolved =
    path.resolve(
      UPLOAD_DIR,
      filename
    );

  const relative =
    path.relative(
      UPLOAD_DIR,
      resolved
    );

  if (
    relative.startsWith(
      '..'
    ) ||
    path.isAbsolute(
      relative
    )
  ) {
    throw new Error(
      'Invalid template file path'
    );
  }

  return resolved;
};

const createTemplateStorageKey = (
  originalName = ''
) => {
  const extension =
    path
      .extname(
        originalName
      )
      .toLowerCase();

  return (
    `templates/${crypto.randomUUID()}${extension}`
  );
};

const createS3Reference = (
  key
) => {
  return `s3:${key}`;
};

const isS3Reference = (
  value
) => {
  return (
    typeof value ===
      'string' &&
    value.startsWith(
      's3:'
    )
  );
};

const getS3Key = (
  reference
) => {
  return reference.slice(
    3
  );
};

const assertS3Config = () => {
  if (
    !S3_BUCKET_NAME ||
    !process.env.AWS_REGION ||
    !process.env.AWS_ENDPOINT_URL_S3 ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      'Object storage configuration is missing'
    );
  }
};

const uploadTemplateToS3 =
  async (
    file
  ) => {
    if (
      !file?.buffer
    ) {
      throw new Error(
        'Template file is required'
      );
    }

    assertS3Config();

    const key =
      createTemplateStorageKey(
        file.originalname
      );

    await s3Client.send(
      new PutObjectCommand({
        Bucket:
          S3_BUCKET_NAME,

        Key:
          key,

        Body:
          file.buffer,

        ContentType:
          file.mimetype ||
          'application/octet-stream',
      })
    );

    return {
      key,

      reference:
        createS3Reference(
          key
        ),
    };
  };

const deleteS3ObjectSafely =
  async (
    reference
  ) => {
    if (
      !isS3Reference(
        reference
      )
    ) {
      return;
    }

    try {
      assertS3Config();

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket:
            S3_BUCKET_NAME,

          Key:
            getS3Key(
              reference
            ),
        })
      );
    } catch {
      // Rollback cleanup ana hatayı ezmesin.
    }
  };

const getS3Stream =
  async (
    reference
  ) => {
    assertS3Config();

    try {
      const response =
        await s3Client.send(
          new GetObjectCommand({
            Bucket:
              S3_BUCKET_NAME,

            Key:
              getS3Key(
                reference
              ),
          })
        );

      if (
        !response.Body
      ) {
        throw new Error(
          'Template file not found'
        );
      }

      return response.Body;
    } catch {
      throw new Error(
        'Template file not found'
      );
    }
  };

const streamToBuffer =
  async (
    stream
  ) => {
    const chunks =
      [];

    for await (
      const chunk of stream
    ) {
      chunks.push(
        Buffer.isBuffer(
          chunk
        )
          ? chunk
          : Buffer.from(
              chunk
            )
      );
    }

    return Buffer.concat(
      chunks
    );
  };

const readTemplateBuffer =
  async (
    template
  ) => {
    if (
      !template?.file_url
    ) {
      throw new Error(
        'Template file not found'
      );
    }

    if (
      isS3Reference(
        template.file_url
      )
    ) {
      const stream =
        await getS3Stream(
          template.file_url
        );

      return streamToBuffer(
        stream
      );
    }

    // Eski lokal şablonlar için fallback.
    const filePath =
      resolveTemplateFilePath(
        template.file_url
      );

    try {
      return await fsPromises.readFile(
        filePath
      );
    } catch {
      throw new Error(
        'Template file not found'
      );
    }
  };

const isUdfTemplate = (
  template
) => {
  const extension =
    path
      .extname(
        template?.file_name ||
        ''
      )
      .toLowerCase();

  return (
    extension === '.udf'
  );
};

const pointToMm = (
  value,
  fallback
) => {
  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return fallback;
  }

  return Number(
    (
      numeric *
      0.352777778
    ).toFixed(
      2
    )
  );
};

// ======================================================
// SERVICE
// ======================================================

export const templateService = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data
  ) {
    return Template.create(
      data
    );
  },

  // ====================================================
  // OBJECT STORAGE
  // ====================================================

  async uploadFile(
    file
  ) {
    const {
      reference,
    } =
      await uploadTemplateToS3(
        file
      );

    return {
      file_url:
        reference,

      file_name:
        file.originalname,

      file_size:
        file.size,

      file_type:
        file.mimetype ||
        'application/octet-stream',
    };
  },

  async deleteUploadedFileSafely(
    reference
  ) {
    await deleteS3ObjectSafely(
      reference
    );
  },


  // ====================================================
  // FIND ALL
  // ====================================================

  async findAll({
    page,
    limit,
    category,
    law_area,
    search,
  }) {
    const where =
      {};

    if (
      category
    ) {
      where.category =
        category;
    }

    if (
      law_area
    ) {
      where.law_area =
        law_area;
    }

    if (
      search
    ) {
      where[
        Op.or
      ] = [
        {
          title: {
            [Op.iLike]:
              `%${search}%`,
          },
        },

        {
          description: {
            [Op.iLike]:
              `%${search}%`,
          },
        },
      ];
    }

    const query =
      paginate(
        {
          where,
        },
        page,
        limit
      );

    const {
      count,
      rows,
    } =
      await Template.findAndCountAll({
        ...query,

        include: [
          {
            model:
              User,

            as:
              'creator',

            attributes: [
              'id',
              'first_name',
              'last_name',
            ],
          },
        ],

        order: [
          [
            'created_at',
            'DESC',
          ],
        ],
      });

    return {
      data:
        rows,

      pagination:
        getPaginationData(
          count,
          page,
          limit
        ),
    };
  },

  // ====================================================
  // FIND ONE
  // ====================================================

  async findOne(
    id
  ) {
    const template =
      await Template.findByPk(
        id,
        {
          include: [
            {
              model:
                User,

              as:
                'creator',

              attributes: [
                'id',
                'first_name',
                'last_name',
              ],
            },

            {
              model:
                User,

              as:
                'updater',

              attributes: [
                'id',
                'first_name',
                'last_name',
              ],
            },
          ],
        }
      );

    if (
      !template
    ) {
      throw new Error(
        'Template not found'
      );
    }

    return template;
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    id,
    data
  ) {
    const template =
      await Template.findByPk(
        id
      );

    if (
      !template
    ) {
      throw new Error(
        'Template not found'
      );
    }

    await template.update(
      data
    );

    return template;
  },

  // ====================================================
  // REMOVE
  // ====================================================

  async remove(
    id
  ) {
    const template =
      await Template.findByPk(
        id
      );

    if (
      !template
    ) {
      throw new Error(
        'Template not found'
      );
    }

    await template.destroy();

    return template;
  },

  // ====================================================
  // DOWNLOAD COUNT
  // ====================================================

  async incrementDownload(
    id
  ) {
    const template =
      await Template.findByPk(
        id
      );

    if (
      !template
    ) {
      throw new Error(
        'Template not found'
      );
    }

    await template.increment(
      'download_count'
    );

    return template;
  },

  // ====================================================
  // FILE ACCESS
  // ====================================================

  async getFilePath(
    id
  ) {
    const template =
      await this.findOne(
        id
      );

    if (
      !template.file_url
    ) {
      throw new Error(
        'Dosya bulunamadı'
      );
    }

    if (
      isS3Reference(
        template.file_url
      )
    ) {
      throw new Error(
        'Template file is stored in object storage'
      );
    }

    const filePath =
      resolveTemplateFilePath(
        template.file_url
      );

    try {
      await fsPromises.access(
        filePath
      );
    } catch {
      throw new Error(
        'Dosya bulunamadı'
      );
    }

    return {
      template,
      filePath,
    };
  },

  async getFileStream(
    id
  ) {
    const template =
      await this.findOne(
        id
      );

    if (
      !template.file_url
    ) {
      throw new Error(
        'Dosya bulunamadı'
      );
    }

    if (
      isS3Reference(
        template.file_url
      )
    ) {
      const stream =
        await getS3Stream(
          template.file_url
        );

      return {
        template,
        stream,
      };
    }

    const filePath =
      resolveTemplateFilePath(
        template.file_url
      );

    try {
      await fsPromises.access(
        filePath
      );
    } catch {
      throw new Error(
        'Dosya bulunamadı'
      );
    }

    return {
      template,

      stream:
        fs.createReadStream(
          filePath
        ),
    };
  },

  // ====================================================
  // UDF PREVIEW
  // ====================================================

  async getUdfPreview(
  id
) {
  const template =
    await this.findOne(
      id
    );

  if (
    !isUdfTemplate(
      template
    )
  ) {
    throw new Error(
      'Template is not a UDF file'
    );
  }

  // ====================================================
  // READ UDF
  // ====================================================

  let udfBuffer;

  try {
    udfBuffer =
      await readTemplateBuffer(
        template
      );
  } catch {
    throw new Error(
      'UDF file could not be read'
    );
  }

  if (
    !udfBuffer?.length
  ) {
    throw new Error(
      'UDF file is empty'
    );
  }

  const MAX_XML_SIZE =
    5 *
    1024 *
    1024;

  // ====================================================
  // FORMAT DETECTION
  // ====================================================

  const hasZipSignature =
    udfBuffer.length >= 4 &&
    udfBuffer[0] === 0x50 &&
    udfBuffer[1] === 0x4b;

  const beginning =
    udfBuffer
      .subarray(
        0,
        Math.min(
          udfBuffer.length,
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

  const isRawXml =
    beginning.startsWith(
      '<?xml'
    ) ||
    beginning.startsWith(
      '<template'
    );

  if (
    !hasZipSignature &&
    !isRawXml
  ) {
    throw new Error(
      'Unsupported UDF file format'
    );
  }

  // ====================================================
  // XML PARSER
  // ====================================================

  const parser =
    new XMLParser({
      ignoreAttributes:
        false,

      attributeNamePrefix:
        '',

      trimValues:
        false,

      parseTagValue:
        false,

      parseAttributeValue:
        false,

      cdataPropName:
        '__cdata',
    });

  let xml =
    null;

  let entries =
    [];

  let getEntryBuffer =
    null;

  let hasSignature =
    false;

  // ====================================================
  // ZIP UDF
  // ====================================================

  if (
    hasZipSignature
  ) {
    try {
      const zip =
        new AdmZip(
          udfBuffer
        );

      const admEntries =
        zip.getEntries();

      entries =
        admEntries.map(
          (
            entry
          ) => ({
            name:
              entry.entryName,

            size:
              Number(
                entry.header?.size
              ) || 0,

            source:
              entry,
          })
        );

      getEntryBuffer =
        async (
          entry
        ) => {
          return entry
            .source
            .getData();
        };
    } catch (
      admZipError
    ) {
      try {
        const directory =
          await unzipper.Open.buffer(
            udfBuffer
          );

        entries =
          directory.files.map(
            (
              entry
            ) => ({
              name:
                entry.path,

              size:
                Number(
                  entry.uncompressedSize
                ) || 0,

              source:
                entry,
            })
          );

        getEntryBuffer =
          async (
            entry
          ) => {
            return entry
              .source
              .buffer();
          };
      } catch (
        unzipperError
      ) {
        console.error(
          'Template UDF ZIP open failed:',
          {
            templateId:
              template.id,

            fileName:
              template.file_name,

            fileSize:
              udfBuffer.length,

            admZipError:
              admZipError?.message,

            unzipperError:
              unzipperError?.message,
          }
        );

        throw new Error(
          'UDF container could not be opened'
        );
      }
    }

    // ==================================================
    // ZIP VALIDATION
    // ==================================================

    if (
      !Array.isArray(
        entries
      ) ||
      entries.length ===
        0
    ) {
      throw new Error(
        'UDF container is empty'
      );
    }

    if (
      entries.length >
      100
    ) {
      throw new Error(
        'UDF container contains too many files'
      );
    }

    // ==================================================
    // CONTENT.XML
    // ==================================================

    const contentEntry =
      entries.find(
        (
          entry
        ) =>
          path
            .basename(
              entry.name ||
              ''
            )
            .toLowerCase() ===
          'content.xml'
      );

    if (
      !contentEntry
    ) {
      throw new Error(
        'UDF content.xml not found'
      );
    }

    if (
      contentEntry.size >
      MAX_XML_SIZE
    ) {
      throw new Error(
        'UDF document content is too large'
      );
    }

    let contentBuffer;

    try {
      contentBuffer =
        await getEntryBuffer(
          contentEntry
        );
    } catch {
      throw new Error(
        'UDF content.xml could not be extracted'
      );
    }

    if (
      !contentBuffer?.length
    ) {
      throw new Error(
        'UDF content is empty'
      );
    }

    if (
      contentBuffer.length >
      MAX_XML_SIZE
    ) {
      throw new Error(
        'UDF document content is too large'
      );
    }

    xml =
      contentBuffer.toString(
        'utf8'
      );

    // ==================================================
    // SIGNATURE
    // ==================================================

    const signatureEntry =
      entries.find(
        (
          entry
        ) => {
          const fileName =
            path
              .basename(
                entry.name ||
                ''
              )
              .toLowerCase();

          return (
            fileName ===
              'sign.sgn' ||
            fileName ===
              'signature.p7s'
          );
        }
      );

    hasSignature =
      Boolean(
        signatureEntry
      );
  }

  // ====================================================
  // RAW XML UDF
  // ====================================================

  if (
    isRawXml
  ) {
    if (
      udfBuffer.length >
      MAX_XML_SIZE
    ) {
      throw new Error(
        'UDF document content is too large'
      );
    }

    xml =
      udfBuffer
        .toString(
          'utf8'
        )
        .replace(
          /^\uFEFF/,
          ''
        );

    hasSignature =
      false;
  }

  // ====================================================
  // XML VALIDATION
  // ====================================================

  if (
    !xml ||
    !xml.trim()
  ) {
    throw new Error(
      'UDF content is empty'
    );
  }

  // ====================================================
  // PARSE XML
  // ====================================================

  let parsed;

  try {
    parsed =
      parser.parse(
        xml
      );
  } catch {
    throw new Error(
      'UDF XML could not be parsed'
    );
  }

  // ====================================================
  // TEMPLATE ROOT
  // ====================================================

  let templateData =
    parsed?.template ||
    null;

  if (
    !templateData &&
    parsed &&
    typeof parsed ===
      'object'
  ) {
    const templateKey =
      Object.keys(
        parsed
      ).find(
        (
          key
        ) =>
          key
            .toLowerCase()
            .endsWith(
              ':template'
            )
      );

    if (
      templateKey
    ) {
      templateData =
        parsed[
          templateKey
        ];
    }
  }

  if (
    !templateData
  ) {
    throw new Error(
      'UDF template not found'
    );
  }

  // ====================================================
  // CONTENT
  // ====================================================

  let rawContent =
    null;

  if (
    typeof templateData.content ===
    'string'
  ) {
    rawContent =
      templateData.content;
  } else if (
    templateData.content &&
    typeof templateData.content ===
      'object'
  ) {
    rawContent =
      templateData.content
        .__cdata ??
      templateData.content[
        '#text'
      ] ??
      '';
  }

  const content =
    String(
      rawContent ||
      ''
    );

  if (
    !content.trim()
  ) {
    throw new Error(
      'UDF document content is empty'
    );
  }

  // ====================================================
  // PAGE FORMAT
  // ====================================================

  const pageFormat =
    templateData.properties
      ?.pageFormat ||
    templateData.pageFormat ||
    templateData.pageformat ||
    {};

  // ====================================================
  // RESPONSE
  // ====================================================

  return {
    id:
      template.id,

    title:
      template.title,

    file_name:
      template.file_name,

    content,

    elements:
      templateData.elements ||
      null,

    format_version:
      templateData.format_id ||
      null,

    page: {
      width_mm:
        210,

      height_mm:
        297,

      orientation:
        String(
          pageFormat.paperOrientation ||
          '1'
        ),

      margins: {
        left:
          pointToMm(
            pageFormat.leftMargin,
            15
          ),

        right:
          pointToMm(
            pageFormat.rightMargin,
            15
          ),

        top:
          pointToMm(
            pageFormat.topMargin,
            15
          ),

        bottom:
          pointToMm(
            pageFormat.bottomMargin,
            15
          ),
      },
    },

    signature: {
      present:
        hasSignature,

      verified:
        false,
    },

    container_type:
      hasZipSignature
        ? 'zip'
        : 'xml',
  };
},

  // ====================================================
  // META
  // ====================================================

  async getCategories() {
    const categories =
      await Template.findAll({
        attributes: [
          'category',
        ],

        group: [
          'category',
        ],
      });

    return categories
      .map(
        (
          item
        ) =>
          item.category
      )
      .filter(
        Boolean
      );
  },

  async getLawAreas() {
    const lawAreas =
      await Template.findAll({
        attributes: [
          'law_area',
        ],

        group: [
          'law_area',
        ],
      });

    return lawAreas
      .map(
        (
          item
        ) =>
          item.law_area
      )
      .filter(
        Boolean
      );
  },
};