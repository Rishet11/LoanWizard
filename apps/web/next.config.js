/** @type {import('next').NextConfig} */
const nextConfig = {
  // StrictMode double-invokes effects in dev, which causes the perception
  // engine to race with itself acquiring the camera. The engine manages its
  // own lifecycle inside usePerception, so we don't need the double-mount.
  reactStrictMode: false,
  transpilePackages: [
    '@loan-wizard/contracts',
    '@loan-wizard/perception',
    '@tensorflow/tfjs',
    '@tensorflow-models/blazeface',
    '@tensorflow-models/face-landmarks-detection',
  ],
};

module.exports = nextConfig;
