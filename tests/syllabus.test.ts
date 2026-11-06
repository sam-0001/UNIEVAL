import { describe, it, expect } from 'vitest';
import { 
  SYLLABUS_DATASET, 
  DRIVE_FOLDER_ID, 
  DRIVE_FOLDER_URL, 
  DRIVE_EMBED_URL,
  filterSyllabus
} from '../components/home/SyllabusModal';

describe('SPPU Syllabus Feature & Dataset Verification', () => {
  it('should point to the correct Google Drive folder ID and links', () => {
    expect(DRIVE_FOLDER_ID).toBe('1PaXIr_9w7Fz_wcpQnP8yF0YkJlL-N8xU');
    expect(DRIVE_FOLDER_URL).toContain('1PaXIr_9w7Fz_wcpQnP8yF0YkJlL-N8xU');
    expect(DRIVE_EMBED_URL).toBe('https://drive.google.com/embeddedfolderview?id=1PaXIr_9w7Fz_wcpQnP8yF0YkJlL-N8xU#grid');
  });

  it('should contain a complete dataset of 22 syllabus files across FE, SE, and TE', () => {
    expect(SYLLABUS_DATASET.length).toBe(22);

    const feFiles = SYLLABUS_DATASET.filter((s) => s.year === 'FE');
    const seFiles = SYLLABUS_DATASET.filter((s) => s.year === 'SE');
    const teFiles = SYLLABUS_DATASET.filter((s) => s.year === 'TE');

    expect(feFiles.length).toBe(1);
    expect(seFiles.length).toBe(12);
    expect(teFiles.length).toBe(9);
  });

  it('should ensure all syllabus items have valid Google Drive file IDs and titles', () => {
    SYLLABUS_DATASET.forEach((item) => {
      expect(item.id).toBeTruthy();
      expect(item.id.length).toBeGreaterThan(15);
      expect(item.title).toMatch(/\.pdf$/);
      expect(item.branch).toBeTruthy();
      expect(item.yearLabel).toBeTruthy();
      expect(item.pattern).toBeTruthy();
    });
  });

  it('should include core engineering branches in SE and TE', () => {
    const seBranches = SYLLABUS_DATASET.filter((s) => s.year === 'SE').map((s) => s.branch);
    expect(seBranches).toContain('Computer Engineering');
    expect(seBranches).toContain('Information Technology (IT)');
    expect(seBranches).toContain('Mechanical Engineering');
    expect(seBranches).toContain('Civil Engineering');
    expect(seBranches).toContain('Electronics & Telecommunication (ENTC)');

    const teBranches = SYLLABUS_DATASET.filter((s) => s.year === 'TE').map((s) => s.branch);
    expect(teBranches).toContain('Computer Engineering');
    expect(teBranches).toContain('Mechanical Engineering');
    expect(teBranches).toContain('Electronics & Telecommunication (ENTC)');
  });

  it('should verify SEO files (sitemap, robots, llms) include syllabus & AI search references', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const sitemap = fs.readFileSync(path.resolve(process.cwd(), 'public/sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('https://unieval.in/syllabus');

    const robots = fs.readFileSync(path.resolve(process.cwd(), 'public/robots.txt'), 'utf-8');
    expect(robots).toContain('Allow: /syllabus');
    expect(robots).toContain('User-agent: Google-Extended');

    const llms = fs.readFileSync(path.resolve(process.cwd(), 'public/llms.txt'), 'utf-8');
    expect(llms).toContain('https://unieval.in/syllabus');
    expect(llms).toContain('SPPU Engineering Syllabus Repository');

    const llmsFull = fs.readFileSync(path.resolve(process.cwd(), 'public/llms-full.txt'), 'utf-8');
    expect(llmsFull).toContain('Official SPPU Engineering Syllabus Archive (https://unieval.in/syllabus)');
    expect(llmsFull).toContain('SPPU_FE_2024_Pattern.pdf');
  });

  it('should accurately resolve multi-word natural queries like "SE computer Engineering Syllabus sppu" for any branch', () => {
    // 1. SE Computer Engineering query
    const seCompResults = filterSyllabus(SYLLABUS_DATASET, 'ALL', 'SE computer Engineering Syllabus sppu');
    expect(seCompResults.length).toBe(1);
    expect(seCompResults[0].branch).toBe('Computer Engineering');
    expect(seCompResults[0].year).toBe('SE');

    // 2. SE Information Technology query
    const seItResults = filterSyllabus(SYLLABUS_DATASET, 'ALL', 'sppu se IT syllabus');
    expect(seItResults.length).toBe(1);
    expect(seItResults[0].branch).toBe('Information Technology (IT)');
    expect(seItResults[0].year).toBe('SE');

    // 3. TE Mechanical Engineering query
    const teMechResults = filterSyllabus(SYLLABUS_DATASET, 'ALL', 'TE mechanical syllabus sppu');
    expect(teMechResults.length).toBeGreaterThanOrEqual(1);
    expect(teMechResults.every((item) => item.year === 'TE')).toBe(true);

    // 4. FE Common query
    const feResults = filterSyllabus(SYLLABUS_DATASET, 'ALL', 'FE syllabus sppu engineering');
    expect(feResults.length).toBe(1);
    expect(feResults[0].year).toBe('FE');

    // 5. SE ENTC query
    const seEntcResults = filterSyllabus(SYLLABUS_DATASET, 'ALL', 'SE ENTC syllabus');
    expect(seEntcResults.length).toBe(1);
    expect(seEntcResults[0].branch).toBe('Electronics & Telecommunication (ENTC)');
  });
});
