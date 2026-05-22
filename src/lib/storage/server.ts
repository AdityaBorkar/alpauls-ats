import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/env";

export const r2Client = new S3Client({
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
  requestChecksumCalculation: "WHEN_REQUIRED",
});

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
) {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    ContentType: contentType,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

export function getR2PublicUrl(key: string) {
  return `${env.PUBLIC_R2_PUBLIC_URL}/${key}`;
}
