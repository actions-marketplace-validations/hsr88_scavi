import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
export function storeUpload(key: string, body: Uint8Array) {
  return s3.send(new PutObjectCommand({ Bucket: process.env.UPLOAD_BUCKET, Key: key, Body: body }));
}
