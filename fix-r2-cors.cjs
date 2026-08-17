const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function main() {
  const command = new PutBucketCorsCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
          AllowedOrigins: ['http://localhost:3000', 'https://unieval.in', 'https://www.unieval.in'],
          ExposeHeaders: ['ETag', 'Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges'],
          MaxAgeSeconds: 3600
        }
      ]
    }
  });
  
  try {
    await s3.send(command);
    console.log("CORS updated successfully!");
  } catch(e) {
    console.error("Error updating CORS:", e);
  }
}
main();
