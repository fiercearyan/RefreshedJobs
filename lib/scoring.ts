import type { ApifyJob, Job, Seniority, WorkMode } from "./types";

/**
 * Candidate profile (drives all heuristics):
 *  Backend / distributed-systems engineer, ~4 yrs (IBM Watsonx Agentic-AI platform,
 *  Amadeus airline financial systems). Strong: Java, Spring Boot, Scala, Go; concurrent
 *  high-performance REST microservices. Deep: Kubernetes, Docker, CI/CD (Jenkins, AWS
 *  EKS/EC2/S3), event-driven (Kafka, RabbitMQ), caching/state (Redis, MongoDB, MySQL),
 *  system design, low-latency tuning, observability (OpenTelemetry, Instana, ELK).
 *  Strong interest in AI-platform / agentic-AI infra, model deployment, ML serving.
 *  Targets Backend / Senior SWE-SDE / Platform / AI-platform at mid-to-senior level.
 */

export const CANDIDATE_EXP = 4;

// ---------------------------------------------------------------------------
// Skill dictionaries — map a canonical chip label to the regexes that detect it.
// ---------------------------------------------------------------------------
type Dict = { label: string; re: RegExp }[];

const LANG_DICT: Dict = [
  { label: "Java", re: /\bjava\b(?!script)/i },
  { label: "Spring Boot", re: /\bspring( ?boot)?\b/i },
  { label: "Go", re: /\b(golang|go lang)\b|\bgo\b(?=[ ,.)/])/i },
  { label: "Scala", re: /\bscala\b/i },
  { label: "Python", re: /\bpython\b/i },
  { label: "C++", re: /\bc\+\+\b/i },
  { label: "C", re: /\bc\b(?![+#a-z])/i },
  { label: "C#/.NET", re: /\b(c#|\.net|dotnet|asp\.net)\b/i },
  { label: "Node.js", re: /\b(node\.?js|nodejs)\b/i },
  { label: "TypeScript", re: /\btypescript\b/i },
  { label: "JavaScript", re: /\bjavascript\b/i },
  { label: "Kotlin", re: /\bkotlin\b/i },
  { label: "PHP", re: /\bphp\b/i },
  { label: "Ruby", re: /\bruby\b/i },
  { label: "Rust", re: /\brust\b/i },
  { label: "SQL/NoSQL", re: /\b(sql|nosql|postgres|mysql|mongodb|dynamodb)\b/i },
];

const INFRA_DICT: Dict = [
  { label: "Kubernetes", re: /\b(kubernetes|k8s|eks|aks|gke|openshift)\b/i },
  { label: "Docker", re: /\b(docker|containeri[sz])/i },
  { label: "AWS", re: /\b(aws|amazon web services|ec2|s3|lambda|sqs|sns)\b/i },
  { label: "GCP", re: /\b(gcp|google cloud|bigquery)\b/i },
  { label: "Azure", re: /\bazure\b/i },
  { label: "Kafka", re: /\bkafka\b/i },
  { label: "RabbitMQ", re: /\b(rabbitmq|rabbit mq)\b/i },
  { label: "Redis", re: /\bredis\b/i },
  { label: "Microservices", re: /\bmicro ?services?\b/i },
  { label: "Distributed Systems", re: /\bdistributed (systems?|computing)\b/i },
  { label: "CI/CD", re: /\b(ci\/cd|ci ?cd|continuous (integration|delivery|deployment)|jenkins|gitops|argo ?cd)\b/i },
  { label: "Terraform", re: /\b(terraform|iac|infrastructure as code|bicep|cloudformation)\b/i },
  { label: "Observability", re: /\b(observability|prometheus|grafana|opentelemetry|datadog|new relic|elk|kibana|instana)\b/i },
  { label: "Spark", re: /\b(spark|flink|hadoop)\b/i },
  { label: "MLOps", re: /\b(mlops|model (serving|deployment)|sagemaker|kubeflow|mlflow)\b/i },
  { label: "ML Platform", re: /\b(ml platform|machine learning platform|inference|feature store)\b/i },
  { label: "Serverless", re: /\bserverless\b/i },
  { label: "REST", re: /\b(rest|restful|graphql|grpc)\b/i },
  { label: "Low-latency", re: /\b(low[- ]latency|high[- ]throughput|high[- ]performance)\b/i },
];

function detect(dict: Dict, hay: string): string[] {
  const out: string[] = [];
  for (const { label, re } of dict) {
    if (re.test(hay) && !out.includes(label)) out.push(label);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Work mode
// ---------------------------------------------------------------------------
export function inferWorkMode(j: ApifyJob): WorkMode {
  const hay = `${j.location ?? ""} ${j.title ?? ""} ${j.workType ?? ""} ${j.description ?? ""}`.toLowerCase();
  if (/\bhybrid\b/.test(hay)) return "Hybrid";
  if (/\b(fully remote|remote[- ]first|work from home|wfh|100% remote|remote)\b/.test(hay)) {
    // Guard against "remote" appearing only in a negative phrase.
    if (!/\bno remote\b|\bnot remote\b/.test(hay)) return "Remote";
  }
  return "Onsite";
}

// ---------------------------------------------------------------------------
// Seniority
//   Internship/Entry => Entry, Associate => Mid, Mid-Senior => Senior,
//   Director/Principal/Staff/Executive => Staff. Infer from title when the
//   actor reports "Not Applicable".
// ---------------------------------------------------------------------------
export function mapSeniority(j: ApifyJob): Seniority {
  const lvl = (j.experienceLevel ?? "").toLowerCase();
  if (lvl.includes("internship")) return "Entry";
  if (lvl.includes("entry")) return "Entry";
  if (lvl.includes("associate")) return "Mid";
  if (lvl.includes("mid-senior") || lvl.includes("mid senior")) return "Senior";
  if (lvl.includes("director") || lvl.includes("executive")) return "Staff";

  // Fall back to the title.
  const t = (j.title ?? "").toLowerCase();
  if (/\b(intern|internship|graduate|fresher|trainee)\b/.test(t)) return "Entry";
  if (/\b(principal|staff|architect|distinguished|fellow|head of|vp|director|lead)\b/.test(t)) return "Staff";
  if (/\b(senior|sr\.?|sde ?ii|sde ?2|sde ?iii|sde ?3|engineer ?iii|engineer ?ii)\b/.test(t)) return "Senior";
  if (/\b(junior|jr\.?|associate|sde ?i\b|engineer ?i\b)\b/.test(t)) return "Mid";
  return "Mid";
}

// ---------------------------------------------------------------------------
// Years of experience required (parse from description). null if absent.
// ---------------------------------------------------------------------------
export function parseExperience(j: ApifyJob): { exp: number | null; expTxt: string } {
  const desc = j.description ?? "";
  // Range: "3-5 years", "3 to 5 years"
  const range = desc.match(/(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)/i);
  if (range) {
    const lo = parseInt(range[1], 10);
    const hi = parseInt(range[2], 10);
    return { exp: lo, expTxt: `${lo}–${hi} yrs` };
  }
  // "minimum of 3 years" / "at least 3 years"
  const min = desc.match(/(?:minimum(?: of)?|at least|min\.?)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)/i);
  if (min) {
    const n = parseInt(min[1], 10);
    return { exp: n, expTxt: `${n}+ yrs (min)` };
  }
  // "3+ years" / "3 years"
  const plus = desc.match(/(\d{1,2})\s*\+\s*(?:years?|yrs?)/i);
  if (plus) {
    const n = parseInt(plus[1], 10);
    return { exp: n, expTxt: `${n}+ yrs` };
  }
  const exact = desc.match(/(\d{1,2})\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
  if (exact) {
    const n = parseInt(exact[1], 10);
    return { exp: n, expTxt: `${n}+ yrs` };
  }
  return { exp: null, expTxt: "Not specified" };
}

// ---------------------------------------------------------------------------
// AI / ML-platform flag
// ---------------------------------------------------------------------------
export function detectAi(j: ApifyJob): boolean {
  const hay = `${j.title ?? ""} ${j.description ?? ""} ${j.workType ?? ""}`.toLowerCase();
  return /\b(machine learning|ml platform|mlops|genai|gen ai|generative ai|llm|agentic|ai platform|ai\/ml|model (serving|deployment|inference)|deep learning|sagemaker|bedrock|kubeflow|inference)\b/.test(
    hay,
  );
}

// ---------------------------------------------------------------------------
// Skill extraction (public)
// ---------------------------------------------------------------------------
export function extractSkills(j: ApifyJob): { lang: string[]; infra: string[] } {
  const hay = `${j.title ?? ""} ${j.description ?? ""}`;
  let lang = detect(LANG_DICT, hay);
  const infra = detect(INFRA_DICT, hay);
  // Avoid "C" false positives when C++/C# already matched.
  if (lang.includes("C") && (lang.includes("C++") || lang.includes("C#/.NET"))) {
    lang = lang.filter((l) => l !== "C");
  }
  // Keep chip rows readable.
  return { lang: lang.slice(0, 5), infra: infra.slice(0, 5) };
}

// ---------------------------------------------------------------------------
// Match score (0-100) + one-sentence reason
// ---------------------------------------------------------------------------
const CORE_LANG = new Set(["Java", "Spring Boot", "Go", "Scala"]);
const STRONG_INFRA = new Set([
  "Kubernetes",
  "Kafka",
  "AWS",
  "CI/CD",
  "Docker",
  "Observability",
  "Distributed Systems",
  "Microservices",
  "Terraform",
]);

export function scoreJob(
  j: ApifyJob,
  derived: {
    sen: Seniority;
    exp: number | null;
    ai: boolean;
    lang: string[];
    infra: string[];
  },
): { score: number; reason: string } {
  const hay = `${j.title ?? ""} ${j.description ?? ""}`.toLowerCase();
  let score = 38; // base
  const pos: string[] = [];
  const neg: string[] = [];

  // --- core languages ---
  const core = derived.lang.filter((l) => CORE_LANG.has(l));
  if (core.length) {
    score += Math.min(26, 10 + core.length * 8);
    pos.push(`<b>${core.join(" / ")}</b>`);
  }
  if (derived.lang.includes("Python")) score += 5;

  // --- distributed systems / microservices ---
  if (derived.infra.includes("Distributed Systems")) {
    score += 10;
    pos.push("distributed systems");
  }
  if (derived.infra.includes("Microservices")) {
    score += 6;
    if (!pos.includes("distributed systems")) pos.push("microservices");
  }

  // --- infra overlap ---
  const infraHits = derived.infra.filter((i) => STRONG_INFRA.has(i));
  const infraBonus = Math.min(18, infraHits.length * 4);
  score += infraBonus;
  const infraNice = infraHits.filter(
    (i) => i !== "Distributed Systems" && i !== "Microservices",
  );
  if (infraNice.length) pos.push(infraNice.slice(0, 3).join(", "));

  // --- AI / ML-platform relevance ---
  if (derived.ai) {
    score += 9;
    pos.push("AI/ML-platform relevance");
  }

  // --- seniority fit ---
  if (derived.sen === "Mid" || derived.sen === "Senior") score += 8;
  if (derived.sen === "Entry") {
    score -= 12;
    neg.push("tagged entry-level");
  }
  if (derived.sen === "Staff") {
    score -= 9;
    neg.push("pitched above mid/senior");
  }

  // --- experience proximity to ~4 yrs ---
  if (derived.exp != null) {
    const d = Math.abs(derived.exp - CANDIDATE_EXP);
    score += Math.max(-6, 10 - 2.5 * d);
    if (d <= 1.5) pos.push(`required exp (~${derived.exp} yrs) is close to your ${CANDIDATE_EXP}`);
    if (derived.exp >= 10) neg.push(`wants ${derived.exp}+ yrs`);
  }

  // --- mismatch penalties ---
  const frontendHeavy =
    /\b(react|angular|vue|frontend|front[- ]end|ui developer)\b/.test(hay) &&
    !/\b(backend|back[- ]end|microservices|distributed)\b/.test(hay);
  if (frontendHeavy) {
    score -= 18;
    neg.push("frontend-focused");
  }
  if (/\b(\.net|c#|asp\.net)\b/.test(hay) && core.length === 0) {
    score -= 12;
    neg.push(".NET-centric");
  }
  if (/\b(wintel|windows server|vmware|nutanix|active directory|system administrat)\b/.test(hay)) {
    score -= 20;
    neg.push("Wintel/sysadmin scope");
  }
  if (
    /\b(data engineer|etl|databricks|pyspark|data pipeline|data warehouse)\b/.test(hay) &&
    !derived.infra.includes("Distributed Systems")
  ) {
    score -= 12;
    neg.push("data-engineering specialism");
  }
  if (core.length === 0 && (derived.lang.includes("Node.js") || derived.lang.includes("PHP"))) {
    score -= 6;
    neg.push("core languages sit outside Java/Go/Scala");
  }

  score = Math.max(8, Math.min(98, Math.round(score)));

  // --- assemble one-sentence reason ---
  let reason: string;
  const posPart = pos.length ? pos.slice(0, 3).join(", ") : "general backend scope";
  if (score >= 65) {
    reason = `Strong fit — ${posPart}.`;
  } else if (score >= 50) {
    reason = `Reasonable match — ${posPart}${neg.length ? `, though ${neg[0]}` : ""}.`;
  } else {
    reason = `Partial match — ${posPart}${neg.length ? `; ${neg.slice(0, 2).join(" and ")}` : ""}.`;
  }
  // Capitalize first letter after the dash phrase already handled.
  return { score, reason };
}
