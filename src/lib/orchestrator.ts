import { PrismaClient, ScanStatus, Page as PrismaPage } from '@prisma/client';
import { captureScreenshot } from './scanner';
import { compareScreenshots } from './differ';
import { dispatchNotifications } from './notifications';

const prisma = new PrismaClient();
const DIFF_THRESHOLD = 0.5; // Trigger notifications if diff > 0.5%

interface QueueItem {
  page: PrismaPage;
  attempts: number;
}

export async function runScanForSite(siteId: string, userId?: string) {
  console.log(`Starting scan for site: ${siteId}`);
  
  try {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: { pages: true }
    });

    if (!site) {
      throw new Error('Site not found');
    }

    // Convert pages array to a queue
    const queue = [...site.pages].map(page => ({ page, attempts: 0 }));

    await processQueue(queue, userId);
    console.log(`Scan completed for site: ${siteId}`);
  } catch (error) {
    console.error('Error in scanning orchestrator:', error);
  }
}

export async function runScanForPage(pageId: string, userId?: string) {
  console.log(`Starting scan for single page: ${pageId}`);
  
  try {
    const page = await prisma.page.findUnique({
      where: { id: pageId }
    });

    if (!page) {
      throw new Error('Page not found');
    }

    const queue = [{ page, attempts: 0 }];
    await processQueue(queue, userId);
    console.log(`Scan completed for page: ${pageId}`);
  } catch (error) {
    console.error('Error in single page orchestrator:', error);
  }
}

async function processQueue(queue: QueueItem[], userId?: string) {
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;

    const { page, attempts } = item;
    console.log(`Scanning page: ${page.url} (Attempt ${attempts + 1})`);
    
    let currentScanId: string | null = null;
    try {
      const baseline = await prisma.scan.findFirst({
        where: { pageId: page.id, isBaseline: true },
        orderBy: { createdAt: 'desc' }
      });

      const isNewBaseline = !baseline;

      // 1. Create a PENDING scan so the UI can track progress
      const currentScan = await prisma.scan.create({
        data: {
          pageId: page.id,
          status: 'PENDING',
          isBaseline: isNewBaseline,
          userId // Associate with the user who triggered the scan
        }
      });
      currentScanId = currentScan.id;

      // Capture screenshot and title
      const { filepath: screenshotPath, title } = await captureScreenshot(page.url, page.id, isNewBaseline);

      // Update the page title in the database if it changed or is new
      if (page.title !== title) {
        await prisma.page.update({
          where: { id: page.id },
          data: { title }
        });
      }

      let diffPercentage: number | null = null;
      let diffPath: string | null = null;

      if (baseline && baseline.screenshotPath) {
        console.log(`Comparing against baseline...`);
        const result = await compareScreenshots(baseline.screenshotPath, screenshotPath, page.id);
        diffPercentage = result.diffPercentage;
        diffPath = result.diffPath;
      }

      const status: ScanStatus = (diffPercentage !== null && diffPercentage > DIFF_THRESHOLD) ? 'FAILED' : 'COMPLETED';
      await prisma.scan.update({
        where: { id: currentScanId },
        data: {
          status,
          screenshotPath,
          diffPath,
          diffPercentage
        }
      });

      if (status === 'FAILED' && diffPercentage !== null) {
        console.log(`Visual regression detected (${diffPercentage}%). Dispatching alerts...`);
        const admins = await prisma.user.findMany({ where: { isLocalAdmin: true } });
        for (const admin of admins) {
          await dispatchNotifications({
            userId: admin.id,
            pageUrl: page.url,
            diffPercentage,
            diffPath
          });
        }
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`Error scanning ${page.url}:`, err.message);
      
      // If it's a timeout and we haven't retried yet, push it back to the end of the queue
      if (err.name === 'TimeoutError' || err.message.toLowerCase().includes('timeout')) {
        if (attempts === 0) {
          console.log(`Timeout detected for ${page.url}. Queuing for retry...`);
          queue.push({ page, attempts: attempts + 1 });
        } else {
          console.log(`Page ${page.url} failed again. Marking as TIMEOUT.`);
          if (currentScanId) {
            await prisma.scan.update({
              where: { id: currentScanId },
              data: { status: 'TIMEOUT' }
            });
          }
        }
      } else {
        // Non-timeout errors get marked as FAILED
        if (currentScanId) {
          await prisma.scan.update({
            where: { id: currentScanId },
            data: { status: 'FAILED' }
          });
        }
      }
    }
  }
}
