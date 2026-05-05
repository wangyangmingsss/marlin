/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@marlin/shared', '@marlin/db', '@marlin/ui'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

module.exports = nextConfig
