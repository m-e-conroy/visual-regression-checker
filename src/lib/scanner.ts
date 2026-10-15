import { chromium, Browser } from 'playwright';
import path from 'path';
import fs from 'fs';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserInstance;
}

export async function captureScreenshot(url: string, pageId: string, isBaseline: boolean = false): Promise<{ filepath: string; title: string }> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 },
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();

  try {
    // Navigate and wait for network to be idle to ensure dynamic content loads
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const title = await page.title();

    // Define the save directory
    const baseDir = path.join(process.cwd(), 'data', 'screenshots');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const type = isBaseline ? 'baseline' : 'scan';
    const filename = `${pageId}_${type}_${timestamp}.png`;
    const filepath = path.join(baseDir, filename);

    // Reset height constraints and scroll through page to trigger lazy loaded content
    await page.evaluate(async () => {
      document.documentElement.style.height = 'auto';
      document.body.style.height = 'auto';

      await new Promise<void>((resolve) => {
        let total = 0;
        const dist = 400;
        const timer = setInterval(() => {
          window.scrollBy(0, dist);
          total += dist;
          if (total >= document.body.scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 50);
      });
    });

    // Capture full page screenshot
    await page.screenshot({ path: filepath, fullPage: true });

    return { filepath, title };
  } catch (error) {
    console.error(`Failed to capture screenshot for ${url}:`, error);
    throw error;
  } finally {
    await page.close();
    await context.close();
  }
}

// Ensure browser closes gracefully on app shutdown
process.on('SIGINT', async () => {
  if (browserInstance) {
    await browserInstance.close();
  }
  process.exit();
});
