import { NextRequest, NextResponse } from 'next/server';

// In-memory store for client sync credentials (volatile, ephemeral)
const syncStorage = new Map<string, any>();

// Helper to clean up old sessions (not strictly necessary but good practice)
if (globalThis && !(globalThis as any).syncStorage) {
  (globalThis as any).syncStorage = syncStorage;
}

function getStore(): Map<string, any> {
  return (globalThis as any).syncStorage || syncStorage;
}

// Helper to construct response with proper CORS headers
function corsResponse(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Handle CORS Preflight Requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return corsResponse({ error: 'Sync code is required' }, 400);
    }

    const store = getStore();
    const config = store.get(code.toUpperCase());

    if (!config) {
      return corsResponse({ found: false, message: 'No active configuration found for this code' });
    }

    // Return the active client configuration
    return corsResponse({ found: true, config });
  } catch (error: any) {
    return corsResponse({ error: error.message }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, color, crosshair, features } = body;

    if (!code) {
      return corsResponse({ error: 'Sync code is required' }, 400);
    }

    const uppercaseCode = code.toUpperCase();
    const store = getStore();

    const newConfig = {
      color: color || '#f59e0b',
      crosshair: crosshair || '',
      features: features || { fps: true, boost: true, key: true, autosprint: false, cps: true },
      updatedAt: Date.now(),
    };

    store.set(uppercaseCode, newConfig);

    return corsResponse({ success: true, code: uppercaseCode, config: newConfig });
  } catch (error: any) {
    return corsResponse({ error: error.message }, 500);
  }
}
