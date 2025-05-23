// /** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'res.cloudinary.com',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'img.freepik.com',
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['bcrypt', '@mapbox/node-pre-gyp'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
