/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/schedule",
        destination: "/schedule/workweek",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
