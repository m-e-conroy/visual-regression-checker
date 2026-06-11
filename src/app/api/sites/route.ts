import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { fetchAndParseSitemap } from '@/lib/sitemapParser';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const sites = await prisma.site.findMany({
      include: {
        _count: {
          select: { pages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(sites);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Auth Check
    const cookieStore = await cookies();
    const token = cookieStore.get('vrc_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const body = await request.json();
    const { name, sitemapUrl } = body;

    if (!name || !sitemapUrl) {
      return NextResponse.json({ error: 'Name and sitemapUrl are required.' }, { status: 400 });
    }

    // 1. Fetch and Parse the Sitemap
    const urls = await fetchAndParseSitemap(sitemapUrl);

    if (urls.length === 0) {
      return NextResponse.json({ error: 'No URLs found in the provided sitemap.' }, { status: 400 });
    }

    // 2. Create the Site and its Pages in a transaction
    const site = await prisma.$transaction(async (tx) => {
      const newSite = await tx.site.create({
        data: {
          name,
          sitemapUrl
        }
      });

      // Insert pages (avoiding massive bulk inserts if the list is huge, 
      // but for 3-200 pages, createMany is perfectly fine)
      const pageData = urls.map(url => ({
        siteId: newSite.id,
        url
      }));

      await tx.page.createMany({
        data: pageData,
        skipDuplicates: true
      });

      return newSite;
    });

    return NextResponse.json({ site, pageCount: urls.length });
  } catch (error: any) {
    console.error('Failed to add site:', error);
    return NextResponse.json({ error: error.message || 'Failed to add site' }, { status: 500 });
  }
}
