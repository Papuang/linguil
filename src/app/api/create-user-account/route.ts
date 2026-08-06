import { NextRequest, NextResponse } from 'next/server';

// The URL of the Firebase function to create a new user via email/password.
const CREATE_USER_URL = process.env.NEXT_PUBLIC_FIREBASE_CREATE_USER_FUNCTION_URL!;

// Forwards the client's request to the Firebase function (to solve cross-origin issues).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!CREATE_USER_URL) {
      return new NextResponse(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
    }

    // Forward the request to the Firebase function.
    const response = await fetch(CREATE_USER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers.get('user-agent') ?? '',
        'X-Forwarded-For': req.headers.get('x-forwarded-for') ?? '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new NextResponse(JSON.stringify({ error: errorText || 'Function call failed' }), { status: response.status });
    }

    const data = await response.json();
    return new NextResponse(JSON.stringify(data), { status: 200 });

  } catch (error: any) {
    console.error("Proxy route crashed:", error);
    return new NextResponse(JSON.stringify({ error: `Proxy error: ${error.message}` }), { status: 500 });
  }
}