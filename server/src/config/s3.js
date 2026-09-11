import {
  S3Client,
} from '@aws-sdk/client-s3';

const {
  AWS_REGION,
  AWS_ENDPOINT_URL_S3,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  S3_BUCKET_NAME,
} = process.env;

const s3Client =
  new S3Client({
    region:
      AWS_REGION,

    endpoint:
      AWS_ENDPOINT_URL_S3,

    credentials:
      AWS_ACCESS_KEY_ID &&
      AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId:
              AWS_ACCESS_KEY_ID,

            secretAccessKey:
              AWS_SECRET_ACCESS_KEY,
          }
        : undefined,

    forcePathStyle:
      true,

    requestChecksumCalculation:
      'WHEN_REQUIRED',
  });

export {
  s3Client,
  S3_BUCKET_NAME,
};
