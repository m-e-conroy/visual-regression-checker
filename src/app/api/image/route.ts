import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filepath = searchParams.get('path');

  if (!filepath) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  try {
    // Basic security check to ensure the path stays within our data directory
    const absolutePath = path.resolve(filepath);
    const dataDir = path.resolve(path.join(process.cwd(), 'data'));
    
    if (!absolutePath.startsWith(dataDir)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const imageBuffer = fs.readFileSync(absolutePath);
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 });
  }
}
