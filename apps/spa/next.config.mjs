/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  output: "standalone",
  staticPageGenerationTimeout: 180,
  images: {
    unoptimized: true
  },
  transpilePackages: ["@telecom/tokens", "@telecom/ui"]
};

export default nextConfig;
