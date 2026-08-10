import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

async function clearR2() {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
        console.error("Missing R2 credentials in .env");
        return;
    }

    const s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    });

    console.log(`Clearing all objects from bucket: ${R2_BUCKET_NAME}...`);

    try {
        let isTruncated = true;
        let continuationToken = undefined;
        let totalDeleted = 0;

        while (isTruncated) {
            const listCommand = new ListObjectsV2Command({
                Bucket: R2_BUCKET_NAME,
                ContinuationToken: continuationToken,
            });

            const listResult = await s3Client.send(listCommand);

            if (listResult.Contents && listResult.Contents.length > 0) {
                const objectsToDelete = listResult.Contents.map(obj => ({ Key: obj.Key }));
                
                const deleteCommand = new DeleteObjectsCommand({
                    Bucket: R2_BUCKET_NAME,
                    Delete: { Objects: objectsToDelete }
                });

                await s3Client.send(deleteCommand);
                totalDeleted += objectsToDelete.length;
                console.log(`Deleted ${objectsToDelete.length} objects...`);
            }

            isTruncated = listResult.IsTruncated ?? false;
            continuationToken = listResult.NextContinuationToken;
        }

        console.log(`Successfully deleted ${totalDeleted} objects from R2 bucket.`);
    } catch (error) {
        console.error("Failed to clear R2 bucket:", error);
    }
}

clearR2();
