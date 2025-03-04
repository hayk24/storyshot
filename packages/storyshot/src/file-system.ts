import fs from 'fs/promises';
import path from 'path';
import sanitize from 'sanitize-filename';

export class FileSystem {
  private isFlat: boolean;

  constructor({ isFlat = false }: { isFlat?: boolean } = {}) {
    this.isFlat = isFlat;
  }

  private getPath(kind: string, story: string, extension: string) {
    const outDir = '__screenshots__';
    const name = this.isFlat
      ? sanitize((kind + '_' + story).replace(/\//g, '_'))
      : kind
          .split('/')
          .map((k) => sanitize(k))
          .join('/') +
        '/' +
        sanitize(story);
    const filePath = path.join(outDir, name + extension);

    return filePath;
  }

  async saveScreenshot(kind: string, story: string, buffer: Buffer) {
    const filePath = this.getPath(kind, story, '.png');

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    return filePath;
  }
}
