import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { Response } from "express";

const UPLOADS_DIR = join(process.cwd(), 'uploads');

// Ensure uploads directory exists
async function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
}

export class LocalStorageService {
  async getUploadURL(): Promise<string> {
    await ensureUploadsDir();
    const fileId = randomUUID();
    return `/uploads/${fileId}`;
  }

  async saveFile(fileId: string, buffer: Buffer): Promise<string> {
    await ensureUploadsDir();
    const filePath = join(UPLOADS_DIR, fileId);
    await writeFile(filePath, buffer);
    return filePath;
  }

  async getFile(fileId: string): Promise<Buffer> {
    const filePath = join(UPLOADS_DIR, fileId);
    return await readFile(filePath);
  }

  async getFilePath(fileId: string): Promise<string> {
    return join(UPLOADS_DIR, fileId);
  }

  sendFile(filePath: string, res: Response) {
    res.sendFile(filePath);
  }
}
