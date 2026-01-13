import nextConfig from "eslint-config-next";

const eslintConfig = [
  // Next.js flat config (core-web-vitals + typescript)
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // Relax React Compiler's strict rule for setState in effects for now.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
