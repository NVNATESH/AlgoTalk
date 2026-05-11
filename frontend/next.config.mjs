/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required by the Docker image — Next emits a self-contained server bundle
  // in .next/standalone so the runner stage can ship a minimal image.
  output: 'standalone',
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
