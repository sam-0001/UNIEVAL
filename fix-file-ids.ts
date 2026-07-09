/**
 * fix-file-ids.ts
 * ─────────────────────────────────────────────────────────────
 * ONE-TIME migration script.
 * Backfills missing `id` fields on every section and file inside
 * every Note document in MongoDB.
 *
 * Run once with:
 *   npx ts-node fix-file-ids.ts
 * or if using ESM / ts-node with esm flag:
 *   npx ts-node --esm fix-file-ids.ts
 * ─────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// ── Inline Note schema (same as note.model.ts) ───────────────
const noteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  subjectId: { type: String, required: true },
  teacherId: { type: String, required: true },
  thumbnailUrl: String,
  price: Number,
  originalPrice: Number,
  sections: [{
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    title: String,
    files: [{
      id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
      title: String,
      url: String,
      isFree: Boolean
    }]
  }],
  collegeConfig: { name: String, emailDomain: String }
}, { timestamps: true });

const Note = mongoose.models.Note || mongoose.model('Note', noteSchema);

// ── Main Migration ────────────────────────────────────────────
async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ ERROR: No MONGO_URI found in .env file');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected\n');

  const notes = await Note.find({});
  console.log(`📦 Found ${notes.length} notes to check\n`);

  let totalNotesFixed = 0;
  let totalSectionsFixed = 0;
  let totalFilesFixed = 0;

  for (const note of notes) {
    let noteChanged = false;

    for (const section of note.sections) {
      // Fix missing section ID
      if (!section.id) {
        section.id = new mongoose.Types.ObjectId().toString();
        noteChanged = true;
        totalSectionsFixed++;
        console.log(`  🔧 Fixed section "${section.title}" in note "${note.title}"`);
      }

      for (const file of section.files) {
        // Fix missing file ID
        if (!file.id) {
          file.id = new mongoose.Types.ObjectId().toString();
          noteChanged = true;
          totalFilesFixed++;
          console.log(`    🔧 Fixed file "${file.title}" in section "${section.title}"`);
        }
      }
    }

    if (noteChanged) {
      await note.save();
      totalNotesFixed++;
      console.log(`✅ Saved note: "${note.title}"\n`);
    }
  }

  console.log('─────────────────────────────────────');
  console.log(`✅ Migration complete!`);
  console.log(`   Notes updated:    ${totalNotesFixed}`);
  console.log(`   Sections fixed:   ${totalSectionsFixed}`);
  console.log(`   Files fixed:      ${totalFilesFixed}`);
  console.log('─────────────────────────────────────');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});