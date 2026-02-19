import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Security headers for production hardening
 * These protect against common web vulnerabilities
 */
const securityHeaders = {
    // Prevent clickjacking attacks
    'X-Frame-Options': 'DENY',
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    // Enable XSS filtering in older browsers
    'X-XSS-Protection': '1; mode=block',
    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Restrict browser features/APIs
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
    // HTTP Strict Transport Security (enable in production with HTTPS)
    ...(process.env.NODE_ENV === 'production' ? {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    } : {}),
    // Content Security Policy - adjust based on your needs
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https://xvucakstcmtfoanmgcql.supabase.co",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' http://localhost:3000 ws://localhost:3000 https://xvucakstcmtfoanmgcql.supabase.co wss://xvucakstcmtfoanmgcql.supabase.co https://www.gstatic.com https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://*.firebaseio.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join('; '),
}

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Define public routes that don't require authentication
    const publicRoutes = [
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/join',
        '/api',        // API routes handle their own auth
        '/kiosk',
        '/onboarding', // Has its own client-side auth check
        '/_next',
        '/favicon.ico',
    ]

    // Check if current path is public
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) || pathname === '/'

    // Create response
    let response = NextResponse.next()

    // Apply security headers to all responses
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
    })

    // Supabase auth token refresh
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        // Missing env vars - allow request but skip auth refresh
        return response
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                    })
                    // Re-create the response to ensure cookies are applied if needed
                    // This is a common pattern for Supabase SSR
                    response = NextResponse.next({
                        request,
                    })
                    // Re-apply headers to the new response
                    Object.entries(securityHeaders).forEach(([key, value]) => {
                        response.headers.set(key, value)
                    })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // Get user session
    const { data: { user }, error } = await supabase.auth.getUser()

    // For protected routes, redirect to login if not authenticated
    if (!isPublicRoute && !user) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // If user is authenticated and tries to access login page, redirect to home
    // The home page or client-side routing will handle proper dashboard redirect
    if (user && (pathname === '/login' || pathname === '/signup')) {
        // Don't redirect if there's a mode parameter (e.g., password reset)
        const mode = request.nextUrl.searchParams.get('mode')
        if (!mode) {
            // Redirect to home - the client-side auth context will handle proper routing
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    return response
}

export default proxy

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
