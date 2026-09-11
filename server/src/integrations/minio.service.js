import * as Minio from 'minio';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import crypto from 'crypto';

class MinioService {
  constructor() {
    this.client = null;
    this.bucket = config.MINIO_BUCKET || 'legal-documents';
    this.isConfigured = false;

    if (config.MINIO_ENDPOINT && config.MINIO_ACCESS_KEY) {
      this.client = new Minio.Client({
        endPoint: config.MINIO_ENDPOINT,
        port: config.MINIO_PORT || 9000,
        useSSL: false,
        accessKey: config.MINIO_ACCESS_KEY,
        secretKey: config.MINIO_SECRET_KEY,
      });
      this.isConfigured = true;
      this.initializeBucket();
      logger.info('✅ MinIO service configured');
    } else {
      logger.warn('⚠️ MinIO service not configured');
    }
  }

  async initializeBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        logger.info(`✅ MinIO bucket created: ${this.bucket}`);
      }
    } catch (error) {
      logger.error('MinIO bucket initialization error:', error);
    }
  }

  async uploadFile(file, folder = '') {
    if (!this.isConfigured) {
      logger.warn('File upload skipped - MinIO not configured');
      return null;
    }

    try {
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const ext = file.originalname.split('.').pop();
      const filename = `${timestamp}-${randomString}.${ext}`;
      const objectName = folder ? `${folder}/${filename}` : filename;

      await this.client.putObject(
        this.bucket,
        objectName,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
          'x-amz-meta-originalname': file.originalname,
        }
      );

      const url = await this.client.presignedGetObject(this.bucket, objectName, 24 * 60 * 60);
      
      return {
        filename: objectName,
        url,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      logger.error('MinIO upload error:', error);
      throw error;
    }
  }

  async uploadMultiple(files, folder = '') {
    const results = [];
    for (const file of files) {
      const result = await this.uploadFile(file, folder);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  async getFile(objectName) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const stream = await this.client.getObject(this.bucket, objectName);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('MinIO get file error:', error);
      throw error;
    }
  }

  async deleteFile(objectName) {
    if (!this.isConfigured) {
      return;
    }

    try {
      await this.client.removeObject(this.bucket, objectName);
      logger.info(`File deleted from MinIO: ${objectName}`);
    } catch (error) {
      logger.error('MinIO delete file error:', error);
      throw error;
    }
  }

  async deleteMultiple(objectNames) {
    if (!this.isConfigured) {
      return;
    }

    try {
      await this.client.removeObjects(this.bucket, objectNames);
      logger.info(`Files deleted from MinIO: ${objectNames.length} files`);
    } catch (error) {
      logger.error('MinIO delete multiple error:', error);
      throw error;
    }
  }

  async getSignedUrl(objectName, expiry = 24 * 60 * 60) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      return await this.client.presignedGetObject(this.bucket, objectName, expiry);
    } catch (error) {
      logger.error('MinIO get signed URL error:', error);
      throw error;
    }
  }

  async listFiles(prefix = '', recursive = true) {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const objects = [];
      const stream = this.client.listObjects(this.bucket, prefix, recursive);
      
      for await (const obj of stream) {
        objects.push(obj);
      }
      
      return objects;
    } catch (error) {
      logger.error('MinIO list files error:', error);
      throw error;
    }
  }
}

export const minioService = new MinioService();
export default minioService;