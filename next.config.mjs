/** @type {import("next").NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.astria.ai",
        pathname: "/rails/active_storage/blobs/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "sdbooth2-production.s3.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_BASE_URL: "https://3000-ionwsctjk3fobdw66s42l-93ed546b.manusvm.computer",
  },
};

export default nextConfig;


