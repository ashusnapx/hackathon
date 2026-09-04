/**
 * Create and configure the Kavach Saathi agent on Vaani from the command line.
 *
 * The console is a fine place to click an agent together once. It is a bad place
 * to keep one: nobody can review a dashboard in a pull request, and the prompt,
 * the disposition vocabulary and the extracted-field list are exactly the things
 * that must not drift from the repo. So the agent is built from the same two
 * files the knowledge base is built from — docs/vaani-agent-config.json and the
 * copy-ready prompt in docs/VAANI_AGENT_PROMPT.md — and this script only maps
 * them onto Vaani's API shapes.
 *
 * Endpoints (https://api.vaanivoice.ai, X-API-Key auth, deep-merged PATCHes):
 *   POST  /api/create-agent
 *   PATCH /api/agent/{id}/persona | /training | /experience | /analysis | /deployment
 *
 *   node scripts/vaani-agent.mjs                       # plan: print every payload, no network
 *   node scripts/vaani-agent.mjs create                # create the agent, then configure it
 *   node scripts/vaani-agent.mjs update --agent-id ID  # re-push config to an existing agent
 *
 * Needs VAANI_API_KEY in the environment or .env.local for anything but a plan.
 *
 * The knowledge base is NOT uploaded here. Vaani's published API has no documented
 * endpoint for the .txt reference document — the training endpoint takes a
 * rag_knowledge_base_dict whose shape is unspecified — so docs/vaani-knowledge-base.txt
 * is uploaded in the console. This script refuses to invent an endpoint for it and
 * prints the manual step instead.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.vaanivoice.ai/api";
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

// ── env ─────────────────────────────────────────────────────────────────────
for (const file of [".env.local", ".env"]) {
  const p = resolve(ROOT, file);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// ── inputs ──────────────────────────────────────────────────────────────────
const cfg = JSON.parse(read("docs/vaani-agent-config.json"));

/** The prompt lives in the doc, not in this script, so review happens in one place. */
function systemPrompt() {
  const { file, block } = cfg.systemPrompt;
  const doc = read(file);
  const at = doc.indexOf(`## ${block}`);
  if (at === -1) throw new Error(`prompt block "${block}" not found in ${file}`);
  const fence = doc.slice(at).match(/```(?:\w+)?\n([\s\S]*?)```/);
  if (!fence) throw new Error(`no fenced prompt under "${block}" in ${file}`);
  return fence[1].trim();
}

// ── validation ──────────────────────────────────────────────────────────────
// Every failure here is one that would otherwise be discovered by a victim on a
// live call: an unresolved placeholder read aloud, a truncated field name, a
// knowledge base the agent was told to rely on that was never uploaded.

const problems = [];
const warnings = [];
const prompt = systemPrompt();
const greeting = cfg.agent.welcomeMessage;
const declared = new Set(cfg.dynamicVariables.map((v) => v.name));
const used = new Set([...`${prompt}\n${greeting}`.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]));

for (const name of used) {
  if (!declared.has(name)) problems.push(`{{${name}}} is used but not declared in dynamicVariables`);
}
for (const name of declared) {
  if (!used.has(name)) {
    warnings.push(`{{${name}}} is declared but never used in the prompt or greeting`);
  }
}
const names = cfg.extractedFields.map((f) => f.field);
for (const n of names) if (n.length > 30) problems.push(`extracted field "${n}" exceeds Vaani's 30-character name limit`);
if (new Set(names).size !== names.length) problems.push("duplicate extracted field names");
for (const d of cfg.dispositions.tags) {
  if (d.tag.length > 30) problems.push(`disposition tag "${d.tag}" exceeds 30 characters`);
}

const kbPath = cfg.knowledgeBase.generatedFile;
if (!existsSync(resolve(ROOT, kbPath))) {
  problems.push(`${kbPath} is missing — run: node scripts/gen-vaani-kb.mjs`);
} else {
  const size = statSync(resolve(ROOT, kbPath)).size;
  if (size > cfg.knowledgeBase.maxBytes) problems.push(`${kbPath} is ${size} bytes; Vaani accepts ${cfg.knowledgeBase.maxBytes}`);
}

// ── payloads ────────────────────────────────────────────────────────────────
const voice = (s) => ({
  provider: s.provider,
  model: s.model,
  ...(s.voiceId ? { voice_id: s.voiceId } : {}),
  ...(s.voice ? { voice_name: s.voice } : {}),
  ...(s.config ? { config: s.config } : {}),
});

/**
 * Boost the vocabulary a caller will actually use. The taxonomy already lists it
 * — "phonepe", "digital arrest", "utr" — so the STT keyword list is derived from
 * there rather than being a second list to keep in step.
 */
function sttKeywords() {
  const src = read(cfg.stack.sttKeywords.source);
  const hints = [...src.matchAll(/hints: \[([^\]]*)\]/g)]
    .flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]))
    .filter((h) => /^[a-z0-9 ]{3,20}$/.test(h) && h.split(" ").length <= 2);
  // First-seen order, never alphabetical: the taxonomy leads with financial fraud,
  // so a cap keeps "upi" and "otp" and drops "rummy", not the other way round.
  return [...new Set(hints)].slice(0, cfg.stack.sttKeywords.limit);
}

const persona = {
  identity: {
    system_prompt: prompt,
    greeting_message: {
      agent_message: greeting,
      interruptible: cfg.agent.greeting.interruptible,
      let_user_speak_first: cfg.agent.greeting.letUserSpeakFirst,
    },
  },
  // Nested per the live API, not per the published schema. See stack._shapeNote.
  senses_capabilities: {
    language: cfg.agent.targetLanguage,
    auto_detect: true,
    ears: {
      stt: {
        primary: {
          provider: cfg.stack.stt.provider,
          model: cfg.stack.stt.model,
          language: cfg.agent.targetLanguage,
          keywords: sttKeywords(),
        },
        fallback: { provider: cfg.stack.sttFallback.provider, model: cfg.stack.sttFallback.model },
      },
    },
    brain: {
      llm: {
        primary: { provider: cfg.stack.llm.provider, model: cfg.stack.llm.model, parameters: cfg.stack.llm.parameters },
        fallback: {
          provider: cfg.stack.llmFallback.provider,
          model: cfg.stack.llmFallback.model,
          parameters: cfg.stack.llmFallback.parameters,
        },
        auto_detect: false,
      },
    },
    mouth: { tts: { primary: voice(cfg.stack.tts), fallback: voice(cfg.stack.ttsFallback) } },
  },
  // Nothing a previous caller said may reach this one.
  memories: { use_previous_call_contexts: false },
};

const experience = {
  conversational_experience: {
    eagerness_to_speak: cfg.experience.eagernessToSpeak,
    // A fake call-centre hum and filler words both perform a human the caller is
    // explicitly told this is not.
    bg_noise: { enabled: cfg.experience.backgroundSound !== "none" },
    filler_words: { filler_words_frequency: cfg.experience.fillerWords === "off" ? 0 : 0.5 },
  },
  settings: {
    idle_conversation_settings: {
      pulse_check: true,
      end_conversation_on_idle: true,
      idle_call_warning_timeout: cfg.experience.idleWarningTimeoutSeconds,
      idle_call_hangup_timeout: cfg.experience.idleHangupTimeoutSeconds,
      idle_call_warning_message: cfg.experience.idleWarningMessage,
      idle_call_hangup_message: cfg.experience.idleHangupMessage,
    },
    end_call: { enabled: true, end_call_phrase: cfg.experience.endCallPhrase },
    call_settings: {
      max_call_duration: cfg.experience.maxCallDurationMinutes,
      max_duration_enabled: true,
      enable_voicemail_detection: true,
      action: cfg.experience.voicemailAction,
    },
  },
};

const analysis = {
  evaluations: {
    dispositions: {
      enabled: true,
      prompt_based: [
        {
          name: cfg.dispositions.fieldName,
          type: "string",
          prompt: cfg.dispositions.classificationInstructions,
          list_of_tags: Object.fromEntries(cfg.dispositions.tags.map((d) => [d.tag, d.prompt])),
        },
      ],
    },
    conversation_evaluation: { enabled: true, prompt: cfg.dispositions.conversationEvaluationPrompt },
  },
  extraction: {
    data_collection: {
      enabled: true,
      // Nullable throughout: "I don't know" and "I prefer not to say" are answers,
      // and a schema that cannot hold them invites the model to invent one.
      data_points: cfg.extractedFields.map((f) => ({ name: f.field, prompt: f.prompt, nullable: true })),
    },
    collect_concerns: { enabled: true },
  },
};

const training = {
  knowledge: { use_rag: true },
  know_how: {
    guardrails: {
      level: cfg.guardrails.level,
      // The API rejects bare strings and accepts any object; the item shape is
      // undocumented, so each rule is sent self-describing. Every one of these is
      // also stated in the system prompt, which is the defence that is verifiable.
      custom_rules: cfg.guardrails.customRules.map((rule) => ({ rule })),
    },
  },
};

const deployment =
  cfg.deployment.inboundNumber || cfg.deployment.outboundNumbers.length
    ? {
        deployment: {
          phone: {
            call_type: {
              Inbound: cfg.deployment.inboundNumber || "",
              Outbound: cfg.deployment.outboundNumbers,
            },
          },
        },
      }
    : null;

const sections = [
  ["persona", persona],
  ["training", training],
  ["experience", experience],
  ["analysis", analysis],
  ...(deployment ? [["deployment", deployment]] : []),
];

// ── transport ───────────────────────────────────────────────────────────────
async function call(method, path, body) {
  const key = process.env.VAANI_API_KEY?.trim();
  if (!key) throw new Error("VAANI_API_KEY is not set (environment or .env.local)");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* keep the raw body for the error message */
  }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 500)}`);
  return data ?? text;
}

// ── verification ────────────────────────────────────────────────────────────
// The API answers 200 to a payload in the documented-but-wrong shape and stores
// none of it, so "ok" from a PATCH proves nothing. There is no GET for an agent,
// but every PATCH returns the whole stored object — so an empty PATCH is a read.

const at = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

function checksFor(agent) {
  const want = [
    ["system prompt", "persona.identity.system_prompt", prompt],
    ["greeting", "persona.identity.greeting_message.agent_message", greeting],
    ["greeting interruptible", "persona.identity.greeting_message.interruptible", cfg.agent.greeting.interruptible],
    ["agent speaks first", "persona.identity.greeting_message.let_user_speak_first", cfg.agent.greeting.letUserSpeakFirst],
    ["language", "persona.senses_capabilities.language", cfg.agent.targetLanguage],
    ["STT provider", "persona.senses_capabilities.ears.stt.primary.provider", cfg.stack.stt.provider],
    ["STT model", "persona.senses_capabilities.ears.stt.primary.model", cfg.stack.stt.model],
    ["STT language", "persona.senses_capabilities.ears.stt.primary.language", cfg.agent.targetLanguage],
    ["STT fallback", "persona.senses_capabilities.ears.stt.fallback.provider", cfg.stack.sttFallback.provider],
    ["LLM provider", "persona.senses_capabilities.brain.llm.primary.provider", cfg.stack.llm.provider],
    ["LLM model", "persona.senses_capabilities.brain.llm.primary.model", cfg.stack.llm.model],
    ["LLM temperature", "persona.senses_capabilities.brain.llm.primary.parameters.temperature", cfg.stack.llm.parameters.temperature],
    ["TTS provider", "persona.senses_capabilities.mouth.tts.primary.provider", cfg.stack.tts.provider],
    ["TTS model", "persona.senses_capabilities.mouth.tts.primary.model", cfg.stack.tts.model],
    ["TTS voice", "persona.senses_capabilities.mouth.tts.primary.voice_id", cfg.stack.tts.voiceId],
    ["TTS language", "persona.senses_capabilities.mouth.tts.primary.config.language", cfg.stack.tts.config.language],
    ["TTS fallback voice", "persona.senses_capabilities.mouth.tts.fallback.voice_id", cfg.stack.ttsFallback.voiceId],
    ["TTS fallback language", "persona.senses_capabilities.mouth.tts.fallback.config.language", cfg.stack.ttsFallback.config.language],
    ["no cross-call memory", "persona.memories.use_previous_call_contexts", false],
    ["eagerness", "experience.conversational_experience.eagerness_to_speak", cfg.experience.eagernessToSpeak],
    ["background noise off", "experience.conversational_experience.bg_noise.enabled", false],
    ["idle warning", "experience.settings.idle_conversation_settings.idle_call_warning_message", cfg.experience.idleWarningMessage],
    ["idle hangup", "experience.settings.idle_conversation_settings.idle_call_hangup_message", cfg.experience.idleHangupMessage],
    ["end-call phrase", "experience.settings.end_call.end_call_phrase", cfg.experience.endCallPhrase],
    ["voicemail action", "experience.settings.call_settings.action", cfg.experience.voicemailAction],
    ["RAG enabled", "training.knowledge.use_rag", true],
    ["guardrail level", "training.know_how.guardrails.level", cfg.guardrails.level],
  ].map(([label, path, expected]) => ({ label, expected, actual: at(agent, path) }));

  const counts = [
    ["disposition tags", Object.keys(at(agent, "analysis.evaluations.dispositions.prompt_based.0.list_of_tags") || {}).length, cfg.dispositions.tags.length],
    ["extracted fields", (at(agent, "analysis.extraction.data_collection.data_points") || []).length, cfg.extractedFields.length],
    ["guardrail rules", (at(agent, "training.know_how.guardrails.custom_rules") || []).length, cfg.guardrails.customRules.length],
    ["STT keywords", (at(agent, "persona.senses_capabilities.ears.stt.primary.keywords") || []).length, sttKeywords().length],
  ].map(([label, actual, expected]) => ({ label, expected, actual }));

  return [...want, ...counts];
}

function report(agent) {
  const results = checksFor(agent);
  const short = (v) => {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s === undefined ? "(unset)" : s.length > 58 ? `${s.slice(0, 55)}…` : s;
  };
  let failed = 0;
  for (const r of results) {
    const ok = JSON.stringify(r.actual) === JSON.stringify(r.expected);
    if (!ok) failed++;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${r.label.padEnd(22)} ${ok ? short(r.actual) : `expected ${short(r.expected)}, stored ${short(r.actual)}`}`);
  }
  const kbs = (at(agent, "persona.memories.knowledge_bases") || []).length;
  console.log(`\n  ${kbs ? "ok  " : "todo"} knowledge bases attached: ${kbs}`);
  return failed;
}

// ── commands ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const command = argv.find((a) => !a.startsWith("--")) || "plan";
const agentIdArg = (argv.find((a) => a.startsWith("--agent-id=")) || "").split("=")[1]
  || (argv.includes("--agent-id") ? argv[argv.indexOf("--agent-id") + 1] : undefined);

for (const w of warnings) console.warn(`warning: ${w}`);
if (problems.length) {
  for (const p of problems) console.error(`error: ${p}`);
  process.exit(1);
}

const manualSteps = () => {
  console.log("\nStill manual, by design:");
  console.log(`  1. Upload ${kbPath} in the console knowledge base (.txt, under 1 MB).`);
  console.log("     Vaani publishes no endpoint for the reference document, so this script will not guess one.");
  console.log(`  2. ${cfg.guardrails.contentFlagsNote}`);
  for (const tool of cfg.functionTools) {
    console.log(`  3. ${tool.name}: ${tool.status}. Add a target before promising a human handoff.`);
  }
  console.log("  4. Provision a number and re-run with a deployment configured before any live call.");
};

if (command === "plan") {
  console.log(`Agent: ${cfg.agent.name} (${cfg.agent.service}), language ${cfg.agent.targetLanguage}`);
  console.log(`Prompt: ${prompt.length} characters from ${cfg.systemPrompt.file}`);
  console.log(`Variables: ${[...used].map((v) => `{{${v}}}`).join(" ")}`);
  console.log(`Dispositions: ${cfg.dispositions.tags.length}. Extracted fields: ${cfg.extractedFields.length}.`);
  console.log(`\nPOST ${API}/create-agent`);
  console.log(JSON.stringify({ agent_display_name: cfg.agent.name, config: Object.fromEntries(sections) }, null, 2));
  for (const [name, body] of sections) {
    console.log(`\nPATCH ${API}/agent/{agent_id}/${name}`);
    console.log(JSON.stringify(body, null, 2));
  }
  manualSteps();
  console.log("\nNothing was sent. To create it: node scripts/vaani-agent.mjs create");
} else if (command === "create") {
  const created = await call("POST", "/create-agent", {
    agent_display_name: cfg.agent.name,
    config: Object.fromEntries(sections),
  });
  const id = created?.agent_id;
  console.log(`created agent ${id} (${created?.agent_name})`);
  if (!id) throw new Error("no agent_id in response; not proceeding to configuration");
  // create-agent accepts the whole config, but PATCHing each section afterwards is
  // what proves the server actually kept it.
  for (const [name, body] of sections) {
    await call("PATCH", `/agent/${id}/${name}`, body);
    console.log(`  ${name}: ok`);
  }
  console.log(`\nSet VAANI_AGENT_ID=${id} and VAANI_REVIEWED_AGENT_ID=${id} once a human has reviewed it.`);
  manualSteps();
} else if (command === "update") {
  const id = agentIdArg || process.env.VAANI_AGENT_ID?.trim();
  if (!id) throw new Error("pass --agent-id <id> or set VAANI_AGENT_ID");
  for (const [name, body] of sections) {
    await call("PATCH", `/agent/${id}/${name}`, body);
    console.log(`${name}: pushed`);
  }
  console.log("\nRead back from the server:");
  const failed = report(await call("PATCH", `/agent/${id}/training`, {}));
  manualSteps();
  if (failed) process.exit(1);
} else if (command === "verify") {
  const id = agentIdArg || process.env.VAANI_AGENT_ID?.trim();
  if (!id) throw new Error("pass --agent-id <id> or set VAANI_AGENT_ID");
  const agent = await call("PATCH", `/agent/${id}/training`, {});
  console.log(`agent ${agent.agent_id} (${agent.agent_display_name}), last edited ${agent.last_edited_at}`);
  console.log(`published: ${agent.published_at ?? "not published"}\n`);
  const failed = report(agent);
  console.log(failed ? `\n${failed} setting(s) did not stick.` : "\nEvery configured setting is stored as intended.");
  if (failed) process.exit(1);
} else {
  console.error(`unknown command "${command}". Use: plan | create | update | verify`);
  process.exit(1);
}
