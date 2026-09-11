import axios from '../../app/config/axios.js';

import {
  API_ROUTES,
} from '../../constants/apiRoutes.js';

const {
  DOCUMENTS,
} = API_ROUTES;

const documentApi = {

  // ======================================================
  // DOCUMENTS
  // ======================================================

  getAll: (
    params = {}
  ) => {
    return axios.get(
      DOCUMENTS.GET_ALL,
      {
        params,
      }
    );
  },

  getOne: (
    id
  ) => {
    return axios.get(
      DOCUMENTS.GET_ONE(
        id
      )
    );
  },

  // ======================================================
  // UPLOAD
  // ======================================================

  /*
   * FormData gönderirken Content-Type header'ını
   * elle vermiyoruz.
   *
   * Browser/Axios multipart boundary değerini
   * otomatik üretir.
   */
  upload: (
    data
  ) => {
    return axios.post(
      DOCUMENTS.UPLOAD,
      data
    );
  },

  uploadMultiple: (
    data
  ) => {
    return axios.post(
      DOCUMENTS.UPLOAD_MULTIPLE,
      data
    );
  },

  uploadVersion: (
    id,
    data
  ) => {
    return axios.post(
      DOCUMENTS.UPLOAD_VERSION(
        id
      ),
      data
    );
  },

  // ======================================================
  // UPDATE / DELETE
  // ======================================================

  update: (
    id,
    data
  ) => {
    return axios.patch(
      DOCUMENTS.UPDATE(
        id
      ),
      data
    );
  },

  delete: (
    id
  ) => {
    return axios.delete(
      DOCUMENTS.DELETE(
        id
      )
    );
  },

  // ======================================================
  // FILE ACCESS
  // ======================================================

  /*
   * Orijinal dosyayı indirme.
   *
   * UDF dahil tüm dosyalarda blob döner.
   */
  download: (
    id
  ) => {
    return axios.get(
      DOCUMENTS.DOWNLOAD(
        id
      ),
      {
        responseType:
          'blob',
      }
    );
  },

  /*
   * PDF / image vb. browser tarafından
   * gösterilebilen dosyaların binary preview'ı.
   *
   * UDF burada kullanılmaz.
   */
  preview: (
    id
  ) => {
    return axios.get(
      DOCUMENTS.PREVIEW(
        id
      ),
      {
        responseType:
          'blob',
      }
    );
  },

  // ======================================================
  // UDF PREVIEW
  // ======================================================

  /*
   * UYAP UDF dosyasını binary olarak browser'a
   * göndermek yerine backend'de parse edilmiş
   * preview JSON'unu alır.
   *
   * responseType blob değildir.
   */
  udfPreview: (
    id
  ) => {
    return axios.get(
      DOCUMENTS.UDF_PREVIEW(
        id
      )
    );
  },

  // ======================================================
  // VERSIONS
  // ======================================================

  getVersions: (
    id
  ) => {
    return axios.get(
      DOCUMENTS.VERSIONS(
        id
      )
    );
  },

  // ======================================================
  // META
  // ======================================================

  getCategories:
    () => {
      return axios.get(
        DOCUMENTS.CATEGORIES
      );
    },

  getStatistics:
    () => {
      return axios.get(
        DOCUMENTS.STATISTICS
      );
    },
};

export default documentApi;