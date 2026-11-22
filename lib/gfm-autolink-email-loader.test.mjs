import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import loader from "./gfm-autolink-email-loader.cjs";

const { rewriteGfmAutolinkEmailRegex } = loader;

// The email literal as mdast-util-gfm-autolink-literal 2.0.1 ships it.
const upstreamLiteral = String.raw`/(?<=^|\s|\p{P}|\p{S})([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)/gu`;

// Evaluate the rewritten expression with the given RegExp constructor in scope.
function rewrittenRegExp(RegExpImpl) {
  return new Function("RegExp", rewriteGfmAutolinkEmailRegex(`return ${upstreamLiteral};`))(RegExpImpl);
}

// Safari before 16.4: any lookbehind is an invalid group specifier.
function RegExpWithoutLookbehind(pattern, flags) {
  if (/\(\?<[=!]/.test(pattern)) throw new SyntaxError("Invalid regular expression: invalid group specifier name");
  return new RegExp(pattern, flags);
}

describe("gfm-autolink-email-loader", () => {
  it("rewrites all Safari-incompatible lookbehinds in the installed package", () => {
    const entry = new URL(import.meta.resolve("mdast-util-gfm-autolink-literal"));
    const source = readFileSync(new URL("./lib/index.js", entry), "utf8");
    assert.equal(source.match(/\(\?<[=!]/g)?.length, 4);

    const rewritten = rewriteGfmAutolinkEmailRegex(source);
    assert.ok(!rewritten.includes("(?<"));
  });

  it("builds the upstream regex where lookbehind is supported", () => {
    const regex = rewrittenRegExp(RegExp);
    assert.equal(regex.source, upstreamLiteral.slice(1, -3));
    assert.equal(regex.flags, "gu");
  });

  it("falls back to the 2.0.0 regex where lookbehind is not supported", () => {
    const regex = rewrittenRegExp(RegExpWithoutLookbehind);
    assert.equal(regex.source, String.raw`([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)`);
    assert.equal(regex.flags, "g");
  });

  it("fails when the upstream lookbehind patterns change", () => {
    assert.throws(() => rewriteGfmAutolinkEmailRegex("export const email = /(?<=x)@/g;"), /changed its lookbehind/);
  });
});
