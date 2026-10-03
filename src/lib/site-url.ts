/**
 * The site's public address, for the few places that need an absolute URL:
 * metadata, robots.txt and sitemap.xml. Server side only, read at build.
 *
 * Vercel provides the production domain; once a custom domain is added to
 * the project, it takes over from the .vercel.app one on the next deploy.
 */
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = new URL(host ? `https://${host}` : "http://localhost:3000");
