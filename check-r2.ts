import "dotenv/config";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

async function checkR2() {
  console.log("Checking R2 Connection...");
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error("❌ Missing R2 credentials in .env file.");
    return;
  }

  const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1, // Just fetch 1 object to test the connection
    });
    
    await s3Client.send(command);
    console.log("✅ Successfully connected to Cloudflare R2!");
    console.log(`✅ Bucket "${bucketName}" is accessible.`);
  } catch (error) {
    console.error("❌ Failed to connect to R2 or access the bucket.");
    console.error(error);
  }
}

checkR2();
