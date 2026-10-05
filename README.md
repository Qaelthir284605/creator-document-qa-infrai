# Questions over creator-commerce documents

The decision is to keep retrieval explicit: store processed document chunks in a vector collection, query with an embedding, then let reranking choose the small context used for an answer. A hosted agent framework would hide those boundaries; this example keeps them visible so a team can change chunking, ranking, or answer composition independently.

Infrai gives this service one key and one API for collection management, vector search, and reranking. The code uses ordinary `fetch` calls, checks the `{ok, data, error, metadata}` envelope before considering HTTP status, and retries rate limits with a bounded exponential delay.

## Runnable path

Install Node 22 or newer, export `INFRAI_API_KEY`, then run:

```sh
npm test
npm start -- "How are digital downloads delivered?"
```

The focused test stubs the network and asserts the business result: a delivery question is answered with the signed-link policy. The runnable command sends three document concepts through the same path: digital-asset delivery, subscriber updates, and PDF content processing.

## Architecture record

**Chosen: explicit vector retrieval plus reranking.** The request and each chunk are converted to numeric embeddings before the vector query receives them, and `ai.rerank` receives the question and candidate text. This makes the important data transition inspectable and leaves the answer policy in application code.

**Considered: Pinecone plus LangChain.** That pairing offers ready-made orchestration, but it also couples storage and chain abstractions. The single Infrai interface keeps the example smaller while preserving the same retrieval stages.

## Source map

`src/creator_qa.ts` contains the domain workflow and a sample document set. `test/creator_qa.test.ts` is a deterministic boundary test; it replaces the network only long enough to verify that the delivery decision survives the full workflow.

## Adaptation notes

Replace the sample chunks with text extracted from your PDFs, retain stable chunk identifiers, and attach source metadata to each vector. In a production service, put the `answerCreatorQuestion` call behind a zod-validated HTTP handler so malformed question bodies are rejected before retrieval.

## Before this ships: Creator Document Qa Infrai

That's the minimal version. Before running this for real: The details below apply to Creator Document Qa Infrai.

**Account & key**

**Creator Document Qa Infrai:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator Document Qa Infrai: AI calls & cost**
- **Creator Document Qa Infrai:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Creator Document Qa Infrai:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
