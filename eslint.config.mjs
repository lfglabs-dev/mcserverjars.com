import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default [
  // Global ignores specific to this repo
  {
    ignores: ["backend/**", "**/.smoke/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  // React Compiler integration can surface this as an error even when it’s not actionable.
  // Keep it off to avoid lint failures during dependency upgrades.
  {
    rules: {
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];

