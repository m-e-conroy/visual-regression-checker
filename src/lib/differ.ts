import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export async function compareScreenshots(
  baselinePath: string,
  scanPath: string,
  pageId: string
): Promise<{ diffPercentage: number; diffPath: string | null }> {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(baselinePath)) {
        throw new Error(`Baseline image not found at ${baselinePath}`);
      }
      if (!fs.existsSync(scanPath)) {
        throw new Error(`Scan image not found at ${scanPath}`);
      }

      const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
      const img2 = PNG.sync.read(fs.readFileSync(scanPath));

      const { width, height } = img1;
      const diff = new PNG({ width, height });

      // Compare the two images
      const numDiffPixels = pixelmatch(
        img1.data,
        img2.data,
        diff.data,
        width,
        height,
        { threshold: 0.1 } // Sensible default, could be configurable
      );

      const totalPixels = width * height;
      const diffPercentage = (numDiffPixels / totalPixels) * 100;

      let diffPath: string | null = null;

      // Save diff image if differences exist
      if (numDiffPixels > 0) {
        const baseDir = path.join(process.cwd(), 'data', 'diffs');
        if (!fs.existsSync(baseDir)) {
          fs.mkdirSync(baseDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${pageId}_diff_${timestamp}.png`;
        diffPath = path.join(baseDir, filename);

        fs.writeFileSync(diffPath, PNG.sync.write(diff));
      }

      resolve({
        diffPercentage: parseFloat(diffPercentage.toFixed(2)),
        diffPath,
      });
    } catch (error) {
      console.error('Error during image comparison:', error);
      reject(error);
    }
  });
}
