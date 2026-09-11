import {
  useState,
} from 'react';

import documentApi from './document.api.js';

import toast from 'react-hot-toast';

// ======================================================
// FILE HELPERS
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

  /*
   * Öncelikle RFC 5987 / UTF-8 filename* değerini kullan.
   *
   * Örnek:
   * attachment;
   * filename="dilekce.udf";
   * filename*=UTF-8''dilekce.udf
   */
  const utf8Match =
    contentDisposition.match(
      /filename\*\s*=\s*UTF-8''([^;]+)/i
    );

  if (
    utf8Match?.[1]
  ) {
    try {
      return decodeURIComponent(
        utf8Match[1]
          .trim()
          .replace(
            /^["']|["']$/g,
            ''
          )
      );
    } catch {
      return utf8Match[1]
        .trim()
        .replace(
          /^["']|["']$/g,
          ''
        );
    }
  }

  /*
   * Eski tarayıcı / fallback filename değeri.
   */
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

const getFileExtension = (
  filename = ''
) => {
  const normalized =
    String(filename)
      .trim()
      .toLowerCase();

  const lastDot =
    normalized.lastIndexOf(
      '.'
    );

  if (
    lastDot === -1
  ) {
    return '';
  }

  return normalized.slice(
    lastDot
  );
};

export const useFileUpload = () => {
  const validateFile = (
    file,
    options = {}
  ) => {
    if (!file) {
      return false;
    }

    const {
      maxSize = 10,
      allowedTypes = null,
    } = options;

    const maxSizeBytes =
      maxSize *
      1024 *
      1024;

    if (
      file.size >
      maxSizeBytes
    ) {
      toast.error(
        `Dosya boyutu ${maxSize} MB'dan büyük olamaz`
      );

      return false;
    }

    if (
      Array.isArray(
        allowedTypes
      ) &&
      allowedTypes.length >
        0 &&
      !allowedTypes.includes(
        file.type
      )
    ) {
      toast.error(
        'Dosya türü desteklenmiyor'
      );

      return false;
    }

    return true;
  };

  /*
   * filename ikinci parametre olarak opsiyoneldir.
   *
   * Eski kullanımlar:
   * getFileIcon(mimeType)
   *
   * aynen çalışmaya devam eder.
   *
   * UDF için:
   * getFileIcon(mimeType, originalName)
   */
  const getFileIcon = (
    mimeType,
    filename = ''
  ) => {
    const extension =
      getFileExtension(
        filename
      );

    if (
      extension ===
      '.udf'
    ) {
      return '📑';
    }

    if (!mimeType) {
      return '📎';
    }

    if (
      mimeType.includes(
        'pdf'
      )
    ) {
      return '📄';
    }

    if (
      mimeType.includes(
        'word'
      ) ||
      mimeType.includes(
        'document'
      )
    ) {
      return '📝';
    }

    if (
      mimeType.includes(
        'excel'
      ) ||
      mimeType.includes(
        'sheet'
      )
    ) {
      return '📊';
    }

    if (
      mimeType.includes(
        'image'
      )
    ) {
      return '🖼️';
    }

    if (
      mimeType.includes(
        'video'
      )
    ) {
      return '🎬';
    }

    return '📎';
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

    const index =
      Math.min(
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

  return {
    validateFile,
    getFileIcon,
    formatFileSize,
  };
};

// ======================================================
// DOCUMENT DOWNLOAD
// ======================================================

export const useDocumentDownload =
  () => {
    const [
      isDownloading,
      setIsDownloading,
    ] = useState(false);

    const download =
      async (
        documentId,
        filename =
          'document'
      ) => {
        if (!documentId) {
          toast.error(
            'Geçersiz belge'
          );

          return;
        }

        setIsDownloading(
          true
        );

        let objectUrl = null;
        let anchor = null;

        try {
          const response =
            await documentApi.download(
              documentId
            );

          const contentType =
            response.headers?.[
              'content-type'
            ] ||
            'application/octet-stream';

          const contentDisposition =
            response.headers?.[
              'content-disposition'
            ];

          /*
           * Backend tarafından gönderilen gerçek
           * dosya adını kullan.
           *
           * Örneğin:
           * istinaf.udf
           * karar.pdf
           * dilekce.docx
           */
          const serverFilename =
            getFilenameFromContentDisposition(
              contentDisposition
            );

          const downloadFilename =
            serverFilename ||
            filename ||
            'document';

          const blob =
            new Blob(
              [response.data],
              {
                type:
                  contentType,
              }
            );

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

          /*
           * Artık frontend kendi adını zorlamıyor.
           * Backend'in original_name değeri öncelikli.
           */
          anchor.download =
            downloadFilename;

          anchor.style.display =
            'none';

          window.document.body.appendChild(
            anchor
          );

          anchor.click();

          toast.success(
            'Dosya indirildi'
          );
        } catch (error) {
          const message =
            error?.response
              ?.data?.message ||
            error?.message ||
            'Dosya indirilemedi';

          toast.error(
            message
          );

          throw error;
        } finally {
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

          setIsDownloading(
            false
          );
        }
      };

    return {
      download,
      isDownloading,
    };
  };