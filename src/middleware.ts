import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

// Constant for error message
const ERROR_MESSAGES = {
  TOKEN_MISSING: 'Please sign in to access this page.',
};

export default withAuth(
  function middleware(req) {
    // Get session from req
    const session = req.nextauth.token;

    // Log minimal for debugging (without sensitive information)
    if (!session) {
      console.log('Auth middleware - No session token found');
      const signInUrl = new URL('/', req.url);
      signInUrl.searchParams.set('error', ERROR_MESSAGES.TOKEN_MISSING);
      return NextResponse.redirect(signInUrl);
    }

    // Continue normal flow if authenticated
    return NextResponse.next();
  },
  {
    pages: {
      signIn: '/',
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/workspace/:path*'],
};
