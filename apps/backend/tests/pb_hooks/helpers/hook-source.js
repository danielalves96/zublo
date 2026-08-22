const fs = require("node:fs");
const path = require("node:path");

const HOOKS_DIR = path.join(__dirname, "../../../pb_hooks");

/**
 * PocketBase runs every hook callback on a pooled Goja runtime that never
 * evaluated the file the callback was written in, so a callback only ever
 * sees its own arguments and whatever it require()s itself. Reaching for a
 * binding declared at file scope throws a ReferenceError at request time,
 * long after the code looked fine at startup.
 *
 * These helpers read the hook sources as text so that contract can be
 * checked without a PocketBase binary.
 */

function hookFiles() {
  return fs.readdirSync(HOOKS_DIR)
    .filter((name) => name.endsWith(".pb.js"))
    .sort()
    .map((name) => ({
      name,
      source: fs.readFileSync(path.join(HOOKS_DIR, name), "utf8"),
    }));
}

/** Names bound at the top level of a file — exactly what a callback cannot see. */
function fileScopeBindings(source) {
  const names = [];
  const pattern = /^(?:function|var|const|let)\s+([A-Za-z_$][\w$]*)/;

  for (const line of source.split("\n")) {
    const match = pattern.exec(line);
    if (match) names.push(match[1]);
  }

  return names;
}

function skipToMatchingBrace(source, openIndex) {
  let depth = 0;
  let quote = "";

  for (let i = openIndex; i < source.length; i++) {
    const char = source[i];

    if (quote) {
      if (char === "\\") i++;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
    if (char === "/" && source[i + 1] === "/") { i = source.indexOf("\n", i); continue; }
    if (char === "/" && source[i + 1] === "*") { i = source.indexOf("*/", i) + 1; continue; }
    if (char === "{" || char === "(" || char === "[") depth++;
    if (char === "}" || char === ")" || char === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * Bodies of every function passed to a top-level registration call
 * (routerAdd, onRecordViewRequest, cronAdd, …). Only block bodies are
 * emitted, which is every callback this codebase writes.
 */
function callbackBodies(source) {
  const bodies = [];
  const registration = /^[A-Za-z_$][\w$]*\(/gm;
  let call;

  while ((call = registration.exec(source)) !== null) {
    const argsEnd = skipToMatchingBrace(source, call.index + call[0].length - 1);
    if (argsEnd === -1) continue;

    const args = source.slice(call.index, argsEnd);
    const starts = /function\b|=>/g;
    let marker;

    while ((marker = starts.exec(args)) !== null) {
      const brace = args.indexOf("{", marker.index);
      if (brace === -1) break;

      const bodyEnd = skipToMatchingBrace(args, brace);
      if (bodyEnd === -1) break;

      bodies.push({
        registration: call[0].slice(0, -1),
        body: args.slice(brace, bodyEnd + 1),
      });
      starts.lastIndex = bodyEnd;
    }

    registration.lastIndex = argsEnd;
  }

  return bodies;
}

/** Identifiers actually read as bindings — property accesses and strings do not count. */
function referencedIdentifiers(body) {
  const code = body
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\.\s*[A-Za-z_$][\w$]*/g, "");

  return new Set(code.match(/[A-Za-z_$][\w$]*/g) || []);
}

module.exports = {
  HOOKS_DIR,
  hookFiles,
  fileScopeBindings,
  callbackBodies,
  referencedIdentifiers,
  skipToMatchingBrace,
};
