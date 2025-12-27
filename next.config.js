/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable StrictMode to prevent double mount/unmount in development
  // This was causing WebSocket connections to be immediately closed
  reactStrictMode: false,
}

module.exports = nextConfig

