/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Transforms Tailwind CSS directives into standard CSS.
    '@tailwindcss/postcss': {},
  },
};

export default config;