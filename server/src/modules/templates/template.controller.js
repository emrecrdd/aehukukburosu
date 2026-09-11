import {
  templateService,
} from './template.service.js';

import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';

const isUdfFilename = (
  filename
) => {
  return (
    typeof filename ===
      'string' &&
    filename
      .toLowerCase()
      .endsWith(
        '.udf'
      )
  );
};

const encodeFilename = (
  filename
) => {
  return encodeURIComponent(
    filename ||
    'template'
  )
    .replace(
      /['()]/g,
      (
        character
      ) =>
        `%${character
          .charCodeAt(0)
          .toString(16)
          .toUpperCase()}`
    )
    .replace(
      /\*/g,
      '%2A'
    );
};

const createSafeAsciiFilename = (
  filename
) => {
  return (
    filename ||
    'template'
  )
    .replace(
      /[^\x20-\x7E]/g,
      '_'
    )
    .replace(
      /["\\]/g,
      '_'
    );
};

export const templateController = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    let uploadedFileUrl =
      null;

    try {
      const data = {
        ...req.body,

        created_by:
          req.user.id,
      };

      if (
        req.file
      ) {
        const uploaded =
          await templateService.uploadFile(
            req.file
          );

        uploadedFileUrl =
          uploaded.file_url;

        Object.assign(
          data,
          uploaded
        );
      }

      const template =
        await templateService.create(
          data
        );

      return successResponse(
        res,
        template,
        'Template created successfully',
        201
      );
    } catch (
      error
    ) {
      if (
        uploadedFileUrl
      ) {
        await templateService.deleteUploadedFileSafely(
          uploadedFileUrl
        );
      }

      logger.error(
        'Create template error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // FIND ALL
  // ====================================================

  async findAll(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        law_area,
        search,
      } = req.query;

      const result =
        await templateService.findAll({
          page,
          limit,
          category,
          law_area,
          search,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Templates fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get templates error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // FIND ONE
  // ====================================================

  async findOne(
    req,
    res
  ) {
    try {
      const template =
        await templateService.findOne(
          req.params.id
        );

      return successResponse(
        res,
        template,
        'Template fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get template error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    req,
    res
  ) {
    let uploadedFileUrl =
      null;

    try {
      const data = {
        ...req.body,

        updated_by:
          req.user.id,
      };

      if (
        req.file
      ) {
        const uploaded =
          await templateService.uploadFile(
            req.file
          );

        uploadedFileUrl =
          uploaded.file_url;

        Object.assign(
          data,
          uploaded
        );
      }

      const template =
        await templateService.update(
          req.params.id,
          data
        );

      /*
       * Eski şablon objesini özellikle silmiyoruz.
       * Yanlışlıkla veri kaybını önlemek için eski
       * fiziksel dosya Neon Storage'da kalabilir.
       */

      return successResponse(
        res,
        template,
        'Template updated successfully'
      );
    } catch (
      error
    ) {
      if (
        uploadedFileUrl
      ) {
        await templateService.deleteUploadedFileSafely(
          uploadedFileUrl
        );
      }

      logger.error(
        'Update template error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // REMOVE
  // ====================================================

  async remove(
    req,
    res
  ) {
    try {
      await templateService.remove(
        req.params.id
      );

      /*
       * Normal silmede Object Storage objesini
       * kalıcı olarak silmiyoruz.
       */

      return successResponse(
        res,
        null,
        'Template deleted successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Delete template error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // DOWNLOAD
  // ====================================================

  async download(
    req,
    res
  ) {
    try {
      const {
        template,
        stream,
      } =
        await templateService.getFileStream(
          req.params.id
        );

      await templateService.incrementDownload(
        req.params.id
      );

      const filename =
        template.file_name ||
        'template';

      const encodedFilename =
        encodeFilename(
          filename
        );

      const safeFilename =
        createSafeAsciiFilename(
          filename
        );

      res.setHeader(
        'Cache-Control',
        'private, no-store'
      );

      res.setHeader(
        'Content-Type',
        template.file_type ||
        'application/octet-stream'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
      );

      res.setHeader(
        'X-Content-Type-Options',
        'nosniff'
      );

      stream.on(
        'error',
        (
          error
        ) => {
          logger.error(
            'Template download stream error:',
            error
          );

          if (
            !res.headersSent
          ) {
            res
              .status(
                500
              )
              .end();
          } else {
            res.destroy();
          }
        }
      );

      stream.pipe(
        res
      );
    } catch (
      error
    ) {
      logger.error(
        'Download template error:',
        error
      );

      if (
        res.headersSent
      ) {
        return;
      }

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ====================================================
  // NORMAL PREVIEW
  // ====================================================

  async preview(
    req,
    res
  ) {
    try {
      const {
        template,
        stream,
      } =
        await templateService.getFileStream(
          req.params.id
        );

      if (
        isUdfFilename(
          template.file_name
        )
      ) {
        return errorResponse(
          res,
          'UDF preview must use the UDF preview endpoint',
          400
        );
      }

      const filename =
        template.file_name ||
        'template';

      const encodedFilename =
        encodeFilename(
          filename
        );

      res.setHeader(
        'Cache-Control',
        'private, no-store'
      );

      res.setHeader(
        'Content-Type',
        template.file_type ||
        'application/octet-stream'
      );

      res.setHeader(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodedFilename}`
      );

      res.setHeader(
        'X-Content-Type-Options',
        'nosniff'
      );

      stream.on(
        'error',
        (
          error
        ) => {
          logger.error(
            'Template preview stream error:',
            error
          );

          if (
            !res.headersSent
          ) {
            res
              .status(
                500
              )
              .end();
          } else {
            res.destroy();
          }
        }
      );

      stream.pipe(
        res
      );
    } catch (
      error
    ) {
      logger.error(
        'Preview template error:',
        error
      );

      if (
        res.headersSent
      ) {
        return;
      }

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ====================================================
  // UDF PREVIEW
  // ====================================================

  async previewUdf(
    req,
    res
  ) {
    try {
      const preview =
        await templateService.getUdfPreview(
          req.params.id
        );

      return successResponse(
        res,
        preview,
        'UDF template preview fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Preview UDF template error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // CATEGORIES
  // ====================================================

  async getCategories(
    req,
    res
  ) {
    try {
      const categories =
        await templateService.getCategories();

      return successResponse(
        res,
        categories,
        'Categories fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get categories error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // LAW AREAS
  // ====================================================

  async getLawAreas(
    req,
    res
  ) {
    try {
      const lawAreas =
        await templateService.getLawAreas();

      return successResponse(
        res,
        lawAreas,
        'Law areas fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get law areas error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },
};