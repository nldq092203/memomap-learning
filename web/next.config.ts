import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to allow webpack config
  turbopack: {},
  
  // Optimize for development memory usage
  experimental: {
    // Reduce memory usage
    workerThreads: false,
    cpus: 1,
  },
  
  // Webpack optimizations for development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Reduce memory usage in development
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
      };
    }
    
    return config;
  },
  
  // Reduce build output
  productionBrowserSourceMaps: false,
};

export default nextConfig;
