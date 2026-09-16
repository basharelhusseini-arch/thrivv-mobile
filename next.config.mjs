/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      '/member/forgot-password',
      '/member/reset-password',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/reset-password/validate',
    ].map((source) => ({
      source,
      headers: [
        { key: 'Cache-Control', value: 'no-store, max-age=0' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      ],
    }));
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
