/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is enabled by default in Next.js 14.
  // Disable static export for 404 to avoid build issues
  distDir: '.next',
};

export default nextConfig;
