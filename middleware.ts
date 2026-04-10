import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/agent/webhook')) {
    return NextResponse.next()
  }

  const token = req.cookies.get('session')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret)
    // Admin: inject role header for downstream use
    const response = NextResponse.next()
    if (payload.role === 'admin') {
      response.headers.set('x-user-role', 'admin')
    }
    return response
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', req.url))
    response.cookies.delete('session')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
