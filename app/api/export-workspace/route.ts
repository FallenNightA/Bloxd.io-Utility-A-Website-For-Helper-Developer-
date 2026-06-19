import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  const zip = new JSZip();

  function addDirToZip(dirPath: string, zipFolder: JSZip) {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (['node_modules', '.next', '.git', 'package-lock.json', 'dist', 'build', '.DS_Store'].includes(file)) continue;

      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const folder = zipFolder.folder(file);
        if (folder) {
          addDirToZip(fullPath, folder);
        }
      } else {
        const content = fs.readFileSync(fullPath);
        zipFolder.file(file, content);
      }
    }
  }

  try {
    addDirToZip(process.cwd(), zip);

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': 'attachment; filename="BloxdUtility_Source.zip"',
        'Content-Type': 'application/zip',
      },
    });
  } catch(e: any) {
    return new NextResponse(String(e), {status: 500});
  }
}
