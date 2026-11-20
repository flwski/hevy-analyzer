import assert from "node:assert/strict";
import { test } from "node:test";
import { generateCoachAnswer, parseCoachQuestion, readCoachQuestion, runCoachPilot } from "../lib/coach-ai.ts";

const config = { apiKey: "fake-key", model: "fake-model" };
const input = parseCoachQuestion('{"question":"Preciso de deload?"}');

test("limita e projeta o contexto, descartando dados fora do contrato", () => {
  const result = parseCoachQuestion(JSON.stringify({
    question: "  E o meu RPE?  ",
    context: { rpeCoverage: 72.13, truncated: true, user: "Nome", notes: "privado", prExercise: "X".repeat(120) },
  }));
  assert.deepEqual(result, {
    question: "E o meu RPE?",
    context: { rpeCoverage: 72.1, prExercise: "X".repeat(80), truncated: true },
  });
  assert.throws(() => parseCoachQuestion('{"question":" "}'));
  assert.throws(() => parseCoachQuestion(JSON.stringify({ question: "x".repeat(601) })));
});

test("rejeita corpos acima do limite em bytes", async () => {
  await assert.rejects(readCoachQuestion(new Request("https://example.test", {
    method: "POST", body: JSON.stringify({ question: "a", unused: "á".repeat(1100) }),
  })), /Corpo muito grande/);
});

test("usa Responses API com saída limitada e lê a resposta REST", async () => {
  const answer = await generateCoachAnswer(input, config, async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(options.headers.authorization, "Bearer fake-key");
    assert.ok(options.signal instanceof AbortSignal);
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.max_output_tokens, 400);
    assert.deepEqual(JSON.parse(body.input), input);
    return Response.json({ status: "completed", output: [
      { type: "message", role: "assistant", content: [{ type: "output_text", text: "Revise sua recuperação." }] },
    ] });
  });
  assert.equal(answer, "Revise sua recuperação.");
});

test("usa fallback em 429, 500, timeout, resposta incompleta e recusa", async () => {
  const cases = [
    () => new Response(null, { status: 429 }),
    () => new Response(null, { status: 500 }),
    () => { throw new DOMException("Simulado", "TimeoutError"); },
    () => Response.json({ status: "incomplete" }),
    () => Response.json({ status: "completed", output: [
      { type: "message", role: "assistant", content: [{ type: "refusal" }] },
    ] }),
  ];
  for (const simulate of cases) {
    assert.equal(await runCoachPilot(async () => true,
      () => generateCoachAnswer(input, config, async () => simulate())), null);
  }
});

test("não chama o provedor sem reserva de cota", async () => {
  let calls = 0;
  const generate = async () => { calls++; return "IA"; };
  assert.equal(await runCoachPilot(async () => false, generate), null);
  assert.equal(await runCoachPilot(async () => { throw new Error("Neon indisponível"); }, generate), null);
  assert.equal(calls, 0);
});
