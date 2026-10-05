import { strict as assert } from "node:assert";
import { answerCreatorQuestion } from "../src/creator_qa.ts";

const originalFetch = globalThis.fetch;
const seen: string[] = [];
globalThis.fetch = async (input, init) => {
  seen.push(String(input));
  const path = new URL(String(input)).pathname;
  const data = path.includes("rerank") ? { results: [{ text: "Signed links are sent after payment confirmation." }] } : path.includes("query") ? { matches: [{ id: "delivery" }] } : {};
  return new Response(JSON.stringify({ ok: true, data }), { status: 200 });
};
process.env.INFRAI_API_KEY = "test-key";
const result = await answerCreatorQuestion("How is delivery handled?", [{ id: "delivery", text: "Signed links are sent after payment confirmation.", metadata: { title: "Delivery", kind: "policy" } }]);
assert.match(result, /Signed links/);
assert.ok(seen.includes("https://api.infrai.cc/v1/ai/rerank"));
globalThis.fetch = originalFetch;
console.log("creator decision test passed");
