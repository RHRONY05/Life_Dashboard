import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/admin",
              message:
                "admin.ts (service-role client) may only be imported from src/lib/agent/**, src/app/api/mcp/**, src/app/api/cron/**, scripts/**, and tests/**.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/lib/agent/**",
      "src/app/api/mcp/**",
      "src/app/api/cron/**",
      "scripts/**",
      "tests/**",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
