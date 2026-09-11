import axios from '../../app/config/axios.js';

// ======================================================
// TEMPLATE API
// ======================================================

export const templateApi = {
  // ====================================================
  // LIST / DETAIL
  // ====================================================

  getAll: (
    params = {}
  ) => {
    return axios.get(
      '/templates',
      {
        params,
      }
    );
  },

  getOne: (
    id
  ) => {
    return axios.get(
      `/templates/${id}`
    );
  },

  // ====================================================
  // META
  // ====================================================

  getCategories:
    () => {
      return axios.get(
        '/templates/categories'
      );
    },

  getLawAreas:
    () => {
      return axios.get(
        '/templates/law-areas'
      );
    },

  // ====================================================
  // CREATE
  // ====================================================

  /*
   * data = FormData
   *
   * Content-Type'ı elle vermiyoruz.
   * Browser/Axios multipart boundary değerini
   * otomatik oluşturur.
   */
  create: (
    data
  ) => {
    return axios.post(
      '/templates',
      data
    );
  },

  // ====================================================
  // UPDATE
  // ====================================================

  /*
   * data = FormData
   *
   * Burada da multipart/form-data header'ını
   * elle vermiyoruz.
   */
  update: (
    id,
    data
  ) => {
    return axios.put(
      `/templates/${id}`,
      data
    );
  },

  // ====================================================
  // DELETE
  // ====================================================

  delete: (
    id
  ) => {
    return axios.delete(
      `/templates/${id}`
    );
  },

  // ====================================================
  // DOWNLOAD
  // ====================================================

  /*
   * Orijinal şablon dosyasını indirir.
   *
   * PDF, Word, Excel, image, UDF vb.
   * tamamı blob olarak alınır.
   */
  download: (
    id
  ) => {
    return axios.get(
      `/templates/${id}/download`,
      {
        responseType:
          'blob',
      }
    );
  },

  // ====================================================
  // PREVIEW
  // ====================================================

  /*
   * Browser'ın doğrudan gösterebildiği dosyalar için:
   *
   * - PDF
   * - JPG / JPEG
   * - PNG
   * - GIF
   * - WEBP
   *
   * Backend binary response döndürür.
   */
  preview: (
    id
  ) => {
    return axios.get(
      `/templates/${id}/preview`,
      {
        responseType:
          'blob',
      }
    );
  },

  // ====================================================
  // UDF PREVIEW
  // ====================================================

  /*
   * UYAP .udf dosyasını binary olarak açmaya
   * çalışmıyoruz.
   *
   * Backend UDF'yi parse ederek preview için
   * JSON response döndürür.
   *
   * Bu nedenle responseType: 'blob' YOK.
   */
  udfPreview: (
    id
  ) => {
    return axios.get(
      `/templates/${id}/udf-preview`
    );
  },
};

export default templateApi;