// Bundler loader for mdast-util-gfm-autolink-literal, which remark-gfm uses to
// find bare URLs and emails. Safari before 16.4 cannot parse regex lookbehind.
// Version 2.0.1 added it to the email regex; version 2.1.x added it to all four
// patterns. The older match handlers remain valid without those guards.
"use strict";

const LEGACY_EMAIL_LITERAL = String.raw`/(?<=^|\s|\p{P}|\p{S})([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)/gu`;
const LEGACY_EMAIL_SOURCE = LEGACY_EMAIL_LITERAL.slice(1, LEGACY_EMAIL_LITERAL.lastIndexOf("/"));
const LEGACY_FALLBACK_LITERAL = String.raw`/([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)/g`;

const MODERN_REGEX_REWRITES = [
  [
    String.raw`/(?<![\da-z])(https?:\/\/|www(?=\.))([\w-]*\.[\w\-.]*)([^\t\n\r ]*)/gi`,
    String.raw`/(https?:\/\/|www(?=\.))([\w-]*\.[\w\-.]*)([^\t\n\r ]*)/gi`,
  ],
  [
    String.raw`/(?<![\w+\-.@])xmpp:([\w+\-.]+)@([\w-]+(?:\.[\w-]+)+)(\/(?:[\w\-/]|\.(?=[\dA-Za-z]))*)?/g`,
    String.raw`/xmpp:([\w+\-.]+)@([\w-]+(?:\.[\w-]+)+)(\/(?:[\w\-/]|\.(?=[\dA-Za-z]))*)?/g`,
  ],
  [
    String.raw`/(?<![\w+\-.@])mailto:([\w+\-.]+)@([\w-]+(?:\.[\w-]+)+)/g`,
    String.raw`/mailto:([\w+\-.]+)@([\w-]+(?:\.[\w-]+)+)/g`,
  ],
  [
    String.raw`/(?<![\w+\-.]|(?:^|[^\d@A-Za-z])(?:mailto|xmpp):)([\w+\-.]+)@([\w-]+(?:\.[\w-]+)+)/g`,
    String.raw`/([\w+\-.]+)@([\w-]+(?:\.[\w-]+)+)/g`,
  ],
];

function rewriteGfmAutolinkEmailRegex(source) {
  const legacyIndex = source.indexOf(LEGACY_EMAIL_LITERAL);
  if (legacyIndex !== -1) {
    const expression =
      `(function () { try { return new RegExp(${JSON.stringify(LEGACY_EMAIL_SOURCE)}, "gu"); } ` +
      `catch (_) { return ${LEGACY_FALLBACK_LITERAL}; } })()`;
    return source.slice(0, legacyIndex) + expression + source.slice(legacyIndex + LEGACY_EMAIL_LITERAL.length);
  }

  let rewritten = source;
  let rewrites = 0;
  for (const [pattern, fallback] of MODERN_REGEX_REWRITES) {
    if (rewritten.includes(pattern)) {
      rewritten = rewritten.replace(pattern, fallback);
      rewrites += 1;
    }
  }
  if (!rewritten.includes("(?<")) return rewritten;
  if (rewrites !== MODERN_REGEX_REWRITES.length) {
    throw new Error(
      "mdast-util-gfm-autolink-literal changed its lookbehind patterns. " +
        "Review lib/gfm-autolink-email-loader.cjs for Safari compatibility (before 16.4, #753).",
    );
  }
  return rewritten;
}

module.exports = function gfmAutolinkEmailLoader(source) {
  return rewriteGfmAutolinkEmailRegex(source);
};
module.exports.rewriteGfmAutolinkEmailRegex = rewriteGfmAutolinkEmailRegex;
