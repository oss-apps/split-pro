import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileExists } from '~/lib/utils';

import { db } from '~/server/db';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];

async function convertImageToWebP(inputPath: string, outputPath: string, isThumbnail: boolean) {
  const pipeline = sharp(inputPath);

  if (isThumbnail) {
    pipeline.resize(200);
  } else {
    pipeline.resize({ width: 1200, withoutEnlargement: true });
  }

  await pipeline.webp({ quality: isThumbnail ? 60 : 80 }).toFile(outputPath);
}

async function processFile(
  filePath: string,
  userDir: string,
  fileName: string,
): Promise<{ oldKey: string; newKey: string } | null> {
  const ext = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, ext);

  if (!IMAGE_EXTENSIONS.includes(ext)) {
    console.log(`  Skipping non-image file: ${fileName}`);
    return null;
  }

  const userId = path.basename(userDir);
  const oldKey = `${userId}/${fileName}`;

  if (ext === '.webp') {
    const thumbName = `${baseName}-thumb.webp`;
    const thumbPath = path.join(userDir, thumbName);

    if (await fileExists(thumbPath)) {
      console.log(`  WebP file already has thumbnail: ${fileName}`);
      return null;
    }

    console.log(`  Creating thumbnail for existing WebP: ${fileName}`);
    await convertImageToWebP(filePath, thumbPath, true);
    console.log(`  Created thumbnail: ${thumbName}`);

    return { oldKey, newKey: oldKey };
  }

  const newFileName = `${baseName}.webp`;
  const newFilePath = path.join(userDir, newFileName);
  const thumbName = `${baseName}-thumb.webp`;
  const thumbPath = path.join(userDir, thumbName);

  console.log(`  Converting to WebP: ${fileName} -> ${newFileName}`);
  await convertImageToWebP(filePath, newFilePath, false);
  console.log(`  Creating thumbnail: ${thumbName}`);
  await convertImageToWebP(filePath, thumbPath, true);

  console.log(`  Deleting original: ${fileName}`);
  await fs.unlink(filePath);

  const newKey = `${userId}/${newFileName}`;
  return { oldKey, newKey };
}

async function processUserDirectory(
  userDir: string,
): Promise<Array<{ oldKey: string; newKey: string }>> {
  const userId = path.basename(userDir);
  console.log(`\nProcessing user directory: ${userId}`);

  const files = await fs.readdir(userDir);
  const convertedFiles: Array<{ oldKey: string; newKey: string }> = [];

  for (const file of files) {
    const filePath = path.join(userDir, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      console.log(`  Skipping subdirectory: ${file}`);
      continue;
    }

    try {
      const result = await processFile(filePath, userDir, file);
      if (result) {
        convertedFiles.push(result);
      }
    } catch (error) {
      console.error(`  ERROR processing file ${file}:`, error);
      throw new Error(`Failed to convert file: ${filePath}. Migration aborted.`);
    }
  }

  return convertedFiles;
}

async function updateDatabaseFileKeys(convertedFiles: Array<{ oldKey: string; newKey: string }>) {
  console.log('\nUpdating database file keys...');

  for (const { oldKey, newKey } of convertedFiles) {
    if (oldKey === newKey) {
      continue;
    }

    try {
      const expenses = await db.expense.findMany({
        where: { fileKey: oldKey },
        select: { id: true },
      });

      if (0 === expenses.length) {
        console.log(`  No expenses found with fileKey: ${oldKey}`);
        continue;
      }

      for (const expense of expenses) {
        await db.expense.update({
          where: { id: expense.id },
          data: { fileKey: newKey },
        });
      }

      console.log(`  Updated ${expenses.length} expense(s): ${oldKey} -> ${newKey}`);
    } catch (error) {
      console.error(`  ERROR updating database for ${oldKey}:`, error);
      throw new Error(`Failed to update database for fileKey: ${oldKey}. Migration aborted.`);
    }
  }
}

export async function convertExistingFilesToWebP(): Promise<void> {
  console.log('\n=== Converting existing files to WebP format ===\n');

  if (!(await fileExists(UPLOAD_DIR))) {
    console.log('Uploads directory does not exist. Skipping file conversion.');
    return;
  }

  const entries = await fs.readdir(UPLOAD_DIR);
  const userDirs: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(UPLOAD_DIR, entry);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      userDirs.push(entry);
    }
  }

  if (0 === userDirs.length) {
    console.log('No user directories found. Skipping file conversion.');
    return;
  }

  console.log(
    `Found ${userDirs.length} user director${1 === userDirs.length ? 'y' : 'ies'} to process`,
  );

  const allConvertedFiles: Array<{ oldKey: string; newKey: string }> = [];

  for (const userDirName of userDirs) {
    const userDir = path.join(UPLOAD_DIR, userDirName);
    const convertedFiles = await processUserDirectory(userDir);
    allConvertedFiles.push(...convertedFiles);
  }

  const filesToUpdate = allConvertedFiles.filter((f) => f.oldKey !== f.newKey);
  if (0 < filesToUpdate.length) {
    await updateDatabaseFileKeys(filesToUpdate);
  }

  console.log('\n=== File conversion completed successfully ===\n');
}
