import { describe, it, expect } from "vitest";
import {
  generateKey,
  keyPrefix,
  hashKey,
  looksLikeKey,
  rateLimit,
  TOOL_SCOPE,
  SCOPES,
  ToolName,
} from "@/lib/domain/keys";

describe("domain/keys", () => {
  it("matches worked example 1 (32 x 0x00)", () => {
    const bytes = new Uint8Array(32);
    bytes.fill(0);

    const key = generateKey(bytes);
    expect(key).toBe("ld_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(key.length).toBe(46);

    const prefix = keyPrefix(key);
    expect(prefix).toBe("ld_AAAAAAAA");
    expect(prefix.length).toBe(11);

    const hash = hashKey(key);
    expect(hash).toBe(
      "3e80ee88cbe9d5073143a84c599e51f7713a4427c4099bab46aa021d756d206a"
    );
  });

  it("matches worked example 2 (0x00..0x1f)", () => {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = i;
    }

    const key = generateKey(bytes);
    expect(key).toBe("ld_AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8");
    expect(key.length).toBe(46);

    const prefix = keyPrefix(key);
    expect(prefix).toBe("ld_AAECAwQF");
    expect(prefix.length).toBe(11);

    const hash = hashKey(key);
    expect(hash).toBe(
      "219f2fa0e0d4d910e3c9a6b65d91c29d50068ddfe2f991abb48b1cf28eb92556"
    );
  });

  it("validates looksLikeKey format strictly", () => {
    const valid = "ld_AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";
    expect(looksLikeKey(valid)).toBe(true);

    // 45 chars (too short)
    expect(looksLikeKey(valid.slice(0, 45))).toBe(false);
    // 47 chars (too long)
    expect(looksLikeKey(valid + "A")).toBe(false);
    // contains '+' (not base64url)
    expect(looksLikeKey(valid.slice(0, 45) + "+")).toBe(false);
    // missing prefix
    expect(looksLikeKey("xx_" + valid.slice(3))).toBe(false);
  });

  describe("rateLimit", () => {
    const now = new Date("2026-11-04T12:00:00.000Z");

    it("allows 29 calls in the last 60s", () => {
      const timestamps: Date[] = [];
      for (let i = 1; i <= 29; i++) {
        timestamps.push(new Date(now.getTime() - i * 1000));
      }
      const res = rateLimit(timestamps, now);
      expect(res).toEqual({ ok: true });
    });

    it("blocks 30 calls in the last 60s with oldest 50s ago", () => {
      const timestamps: Date[] = [];
      // 29 calls in the last 30s
      for (let i = 1; i <= 29; i++) {
        timestamps.push(new Date(now.getTime() - i * 1000));
      }
      // 30th call 50s ago
      timestamps.push(new Date(now.getTime() - 50 * 1000));

      const res = rateLimit(timestamps, now);
      expect(res).toEqual({ ok: false, retryAfterS: 10 });
    });

    it("blocks 1000 calls in 24h", () => {
      const timestamps: Date[] = [];
      // 999 calls in last hour
      for (let i = 1; i <= 999; i++) {
        timestamps.push(new Date(now.getTime() - i * 2000));
      }
      // 1000th call 80,000s ago
      timestamps.push(new Date(now.getTime() - 80000 * 1000));

      const res = rateLimit(timestamps, now);
      // 86400 - 80000 = 6400
      expect(res).toEqual({ ok: false, retryAfterS: 6400 });
    });
  });

  it("has a scope entry (or null for whoami) for every tool", () => {
    const allTools = Object.keys(TOOL_SCOPE) as ToolName[];
    expect(allTools.length).toBe(38);

    for (const tool of allTools) {
      const scope = TOOL_SCOPE[tool];
      if (tool === "whoami") {
        expect(scope).toBeNull();
      } else {
        expect(scope).not.toBeNull();
        expect(SCOPES).toContain(scope);
      }
    }
  });
});
