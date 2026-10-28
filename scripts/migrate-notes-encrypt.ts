import 'dotenv/config';
import mongoose from 'mongoose';
import crypto, { randomUUID } from 'crypto';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Note, FileKey } from '../server/models/index.js';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME?.trim();

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error("Missing R2 credentials");
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function encryptBuffer(buffer: Buffer): { ciphertext: Buffer; keyHex: string; ivHex: string; authTagHex: string } {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext,
    keyHex: key.toString('hex'),
    ivHex: iv.toString('hex'),
    authTagHex: authTag.toString('hex'),
  };
}

function extractKey(url: string): string | null {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\/+/, '');
  } catch {
    return url.replace(/^\/+/, '');
  }
}

async function run() {
  await mongoose.connect(process.env.DATABASE_URL!);
  console.log("Connected to MongoDB");

  const notes = await Note.find({});
  console.log(`Found ${notes.length} notes`);

  let totalMigrated = 0;

  for (const note of notes) {
    let modified = false;
    for (const sec of note.sections || []) {
      for (const file of sec.files || []) {
        if (file.url && file.url.startsWith('http')) {
          console.log(`Migrating: [${note.title}] -> [${file.title}] (${file.url})`);
          const key = extractKey(file.url);
          if (!key) continue;

          try {
            const getObj = await s3Client.send(new GetObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: key,
            }));
            const rawBytes = await (getObj.Body as any).transformToByteArray();
            const rawBuffer = Buffer.from(rawBytes);

            const fileId = randomUUID();
            const { ciphertext, keyHex, ivHex, authTagHex } = encryptBuffer(rawBuffer);
            const storageKey = `secure-files/${fileId}`;

            await s3Client.send(new PutObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: storageKey,
              Body: ciphertext,
              ContentType: 'application/octet-stream',
            }));

            await FileKey.create({
              fileId,
              keyHex,
              ivHex,
              authTagHex,
              storageType: 'r2',
              storageKey,
              originalName: file.title,
              mimeType: 'application/pdf',
              size: rawBuffer.length,
              isEntry: false,
            });

            file.url = `/api/secure-file-raw/${fileId}`;
            modified = true;
            totalMigrated++;
            console.log(`   -> Successfully encrypted to /api/secure-file-raw/${fileId}`);
          } catch (err: any) {
            console.error(`   -> Failed to migrate file ${file.title}:`, err.message);
          }
        }
      }
    }

    if (modified) {
      await Note.updateOne({ _id: note._id }, { $set: { sections: note.sections } });
      console.log(`Updated Note: ${note.title}`);
    }
  }

  console.log(`\nMigration completed! Total files encrypted: ${totalMigrated}`);
  await mongoose.disconnect();
}

run().catch(console.error);
