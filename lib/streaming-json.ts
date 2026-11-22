type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const VALID_ESCAPES = new Set(["\"", "\\", "/", "b", "f", "n", "r", "t"]);

function repairJson(json: string): string {
  let repaired = "";
  let inString = false;
  for (let index = 0; index < json.length; index++) {
    const char = json[index];
    if (!inString) {
      repaired += char;
      if (char === '"') inString = true;
      continue;
    }
    if (char === '"') {
      repaired += char;
      inString = false;
      continue;
    }
    if (char === "\\") {
      const next = json[index + 1];
      if (next === undefined) {
        repaired += "\\\\";
        continue;
      }
      if (next === "u") {
        const digits = json.slice(index + 2, index + 6);
        if (/^[0-9a-fA-F]{4}$/.test(digits)) {
          repaired += `\\u${digits}`;
          index += 5;
          continue;
        }
      }
      if (VALID_ESCAPES.has(next)) {
        repaired += `\\${next}`;
        index++;
        continue;
      }
      repaired += "\\\\";
      continue;
    }
    const code = char.codePointAt(0);
    if (code !== undefined && code <= 0x1f) {
      switch (char) {
        case "\b": repaired += "\\b"; break;
        case "\f": repaired += "\\f"; break;
        case "\n": repaired += "\\n"; break;
        case "\r": repaired += "\\r"; break;
        case "\t": repaired += "\\t"; break;
        default: repaired += `\\u${code.toString(16).padStart(4, "0")}`;
      }
    } else {
      repaired += char;
    }
  }
  return repaired;
}

function parseWithRepair(json: string): JsonValue {
  try {
    return JSON.parse(json) as JsonValue;
  } catch (error) {
    const repaired = repairJson(json);
    if (repaired !== json) return JSON.parse(repaired) as JsonValue;
    throw error;
  }
}

// Partial JSON parser matching partial-json's default Allow.ALL behavior, used
// by Pi's streaming parser after its malformed-string repair pass.
function parsePartial(source: string): JsonValue {
  const json = source.trim();
  let index = 0;
  const partial = (message: string): never => { throw new Error(`${message} at position ${index}`); };
  const malformed = (message: string): never => { throw new Error(`${message} at position ${index}`); };
  const skipBlank = () => { while (index < json.length && " \n\r\t".includes(json[index])) index++; };

  const parseString = (): string => {
    const start = index++;
    let escape = false;
    while (index < json.length && (json[index] !== '"' || (escape && json[index - 1] === "\\"))) {
      escape = json[index] === "\\" ? !escape : false;
      index++;
    }
    if (json[index] === '"') {
      try { return JSON.parse(json.slice(start, ++index - Number(escape))) as string; }
      catch (error) { return malformed(String(error)); }
    }
    try { return JSON.parse(json.slice(start, index - Number(escape)) + '"') as string; }
    catch {
      try { return JSON.parse(json.slice(start, json.lastIndexOf("\\")) + '"') as string; }
      catch { return partial("Unterminated string literal"); }
    }
  };

  const parseNumber = (): number => {
    const start = index;
    if (index === 0) {
      if (json === "-") malformed("Not sure what '-' is");
      try { return JSON.parse(json) as number; }
      catch {
      try { return JSON.parse(json.substring(0, json.lastIndexOf("e"))) as number; }
        catch (error) { return malformed(String(error)); }
      }
    }
    if (json[index] === "-") index++;
    while (index < json.length && !",]}".includes(json[index])) index++;
    if (index === json.length) partial("Unterminated number literal");
    try { return JSON.parse(json.slice(start, index)) as number; }
    catch {
      if (json.slice(start, index) === "-") partial("Not sure what '-' is");
      try { return JSON.parse(json.substring(start, json.lastIndexOf("e"))) as number; }
      catch (error) { return malformed(String(error)); }
    }
  };

  const parseAny = (): JsonValue => {
    skipBlank();
    if (index >= json.length) partial("Unexpected end of input");
    if (json[index] === '"') return parseString();
    if (json[index] === "{") return parseObject();
    if (json[index] === "[") return parseArray();
    for (const [literal, value] of [["null", null], ["true", true], ["false", false], ["Infinity", Infinity], ["-Infinity", -Infinity], ["NaN", NaN]] as const) {
      if (json.startsWith(literal, index)) { index += literal.length; return value; }
      if (literal.startsWith(json.slice(index)) && index + json.length - index === json.length) return value;
    }
    return parseNumber();
  };

  const parseObject = (): JsonValue => {
    index++;
    skipBlank();
    const object: { [key: string]: JsonValue } = {};
    try {
      while (json[index] !== "}") {
        skipBlank();
        if (index >= json.length) return object;
        const key = parseString();
        skipBlank();
        index++;
        try { object[key] = parseAny(); } catch { return object; }
        skipBlank();
        if (json[index] === ",") index++;
      }
    } catch { return object; }
    index++;
    return object;
  };

  const parseArray = (): JsonValue => {
    index++;
    const array: JsonValue[] = [];
    try {
      while (json[index] !== "]") {
        array.push(parseAny());
        skipBlank();
        if (json[index] === ",") index++;
      }
    } catch { return array; }
    index++;
    return array;
  };

  return parseAny();
}

/** Parse complete or incomplete streamed JSON, preserving the last valid prefix. */
export function parseStreamingJson<T = Record<string, unknown>>(partialJson: string | undefined): T {
  if (!partialJson || partialJson.trim() === "") return {} as T;
  try { return parseWithRepair(partialJson) as T; }
  catch {
    try { return (parsePartial(partialJson) ?? {}) as T; }
    catch {
      try { return (parsePartial(repairJson(partialJson)) ?? {}) as T; }
      catch { return {} as T; }
    }
  }
}
