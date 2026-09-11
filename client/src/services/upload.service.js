import httpService from './http.js';
import toast from 'react-hot-toast';

class UploadService {
  async uploadFile(file, endpoint = '/documents/upload', additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(additionalData).forEach((key) => {
      formData.append(key, additionalData[key]);
    });

    try {
      const response = await httpService.upload(endpoint, formData);
      toast.success('Dosya başarıyla yüklendi');
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Dosya yüklenemedi');
      throw error;
    }
  }

  async uploadMultipleFiles(files, endpoint = '/documents/upload-multiple', additionalData = {}) {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    Object.keys(additionalData).forEach((key) => {
      formData.append(key, additionalData[key]);
    });

    try {
      const response = await httpService.upload(endpoint, formData);
      toast.success(`${files.length} dosya başarıyla yüklendi`);
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Dosyalar yüklenemedi');
      throw error;
    }
  }

  async uploadWithProgress(file, endpoint, onProgress, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(additionalData).forEach((key) => {
      formData.append(key, additionalData[key]);
    });

    try {
      const response = await httpService.api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress?.(percentCompleted);
        },
      });
      
      toast.success('Dosya başarıyla yüklendi');
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Dosya yüklenemedi');
      throw error;
    }
  }

  async downloadFile(url, filename) {
    try {
      await httpService.download(url, filename);
      toast.success('Dosya indirildi');
    } catch (error) {
      toast.error('Dosya indirilemedi');
      throw error;
    }
  }

  validateFile(file, maxSize = 10, allowedTypes = null) {
    const maxSizeBytes = maxSize * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      throw new Error(`Dosya boyutu ${maxSize}MB'dan büyük olamaz`);
    }

    if (allowedTypes && !allowedTypes.includes(file.type)) {
      throw new Error(`Dosya türü desteklenmiyor. İzin verilen türler: ${allowedTypes.join(', ')}`);
    }

    return true;
  }

  getFileIcon(file) {
    const type = file.type || '';
    
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('image')) return '🖼️';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📎';
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

export const uploadService = new UploadService();
export default uploadService;