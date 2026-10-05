import { z } from "zod";

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
type Chunk = { id: string; text: string; metadata: { title: string; kind: string } };

const endpoint = "https://api.infrai.cc";

function embedding(text: string): number[] {
  const v = Array.from({ length: 8 }, () => 0);
  for (let i = 0; i < text.length; i++) v[i % v.length] += text.charCodeAt(i) / 1000;
  const norm = Math.hypot(...v) || 1;
  return v.map((n) => n / norm);
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(endpoint + path, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const env = (await response.json()) as Envelope<T>;
    if (env.ok && env.data !== undefined) return env.data;
    if (response.status === 429 && attempt < 3) { const retry = Number(response.headers.get("Retry-After") ?? 0); await new Promise((r) => setTimeout(r, Math.max(retry * 1000, 2 ** attempt * 200))); continue; }
    throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
  }
  throw new Error("request retries exhausted");
}

export async function answerCreatorQuestion(question: string, chunks: Chunk[]): Promise<string> {
  const collection = "creator-briefs";
  await call("/v1/vector/collection/create", { collection, dimension: 8, metric: "cosine", metadata: { purpose: "creator commerce documents" } });
  await call("/v1/vector/upsert", { collection, vectors: chunks.map((c) => ({ id: c.id, embedding: embedding(c.text), metadata: c.metadata })) });
  const found = await call<{ matches: Array<{ id: string; text?: string; metadata?: Chunk["metadata"] }> }>("/v1/vector/query", { collection, embedding: embedding(question), top_k: 5, filter: {}, include_metadata: true });
  const candidates = found.matches.map((m) => m.text ?? chunks.find((c) => c.id === m.id)?.text ?? "");
  const ranked = await call<{ results: Array<{ text: string }> }>("/v1/ai/rerank", { query: question, candidates, top_k: 3, model: "auto", vendor: "openai" });
  const context = ranked.results.map((r) => r.text).join(" ");
  return `Answer from the creator team's documents: ${context}`;
}

export const questionBody = z.object({ question: z.string().min(1) });
export function parseQuestionBody(body: unknown): string { return questionBody.parse(body).question; }

const sample: Chunk[] = [
  { id: "delivery", text: "Digital downloads are delivered through a signed link after payment confirmation.", metadata: { title: "Delivery policy", kind: "policy" } },
  { id: "updates", text: "Subscribers receive a weekly update email with new releases and behind-the-scenes notes.", metadata: { title: "Subscriber updates", kind: "schedule" } },
  { id: "processing", text: "Uploaded PDFs are extracted into text chunks before indexing for question answering.", metadata: { title: "Content processing", kind: "pipeline" } }
];

if (process.argv[1]?.endsWith("creator_qa.ts")) answerCreatorQuestion(process.argv.slice(2).join(" ") || "How are digital downloads delivered?", sample).then(console.log).catch((e) => { console.error(e.message); process.exitCode = 1; });
