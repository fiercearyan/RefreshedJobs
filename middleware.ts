export { default } from "next-auth/middleware";

// Protect every page except the sign-in page, auth API, and static assets.
// API routes (/api/refresh, /api/profile, /api/status) enforce auth themselves
// and return JSON 401s, so they're excluded here to avoid HTML redirects.
export const config = {
  matcher: ["/((?!api|signin|_next/static|_next/image|favicon.ico).*)"],
};
