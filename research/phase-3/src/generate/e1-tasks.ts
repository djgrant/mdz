/**
 * E1 — handwritten kill-and-resume runbook tasks.
 *
 * Four ~20-step operational runbooks whose side effects flow through the mock
 * "ops" MCP server (tickets, refunds, emails, deploys, notes). Steps
 * interleave idempotent actions (reviewing files, verifying state via
 * ops_lookup, writing working files — harmless to repeat) with side-effectful
 * ops calls (refunds, emails, deploys — repeats are the harm E1 measures).
 *
 * The A-procedure is genuine MDZ notation, not a numbered prose list: each
 * task declares an item list ($orders, $environments, $patches, $datasets)
 * and renders every repeated group as a FOR ... END loop over it; the
 * billing task additionally guards its config edit with an IF ... END block
 * (the same benign condition is stated in prose in the C variant, so the
 * conditional is symmetric). The C-rules variant states the same obligations
 * declaratively, one per-item bullet, with the ordering constraints in prose.
 *
 * Content-matching discipline (the E4 rule — C is NOT a strawman): every step
 * carries an `obligation` phrase built from a single template. Plain steps
 * embed it VERBATIM in both artefacts via the `{OB}` placeholder. Loop steps
 * expand the SAME template twice: once with `{field}` placeholders rewritten
 * to `$item.field` references (the A loop body, stated once, with the item
 * list carrying the per-item data) and once with the item's concrete values
 * (the C per-item bullet, and the reference). Both renderings are mechanical,
 * so the two artefacts cannot drift.
 *
 * The flat `steps` array is the UNROLLED runbook: loop iterations expand to
 * per-item steps in order, and the reference list, seeds, sandbox effects and
 * event logs are all derived from it (unchanged mechanics from the flat-list
 * version).
 *
 * Kill points: `killEarly` (~1/3) and `killLate` (~2/3) are counts of steps
 * already performed before the resume session starts. Wherever a kill region
 * overlaps a loop, the kill lands MID-LOOP-ITERATION — the sharpest position
 * test, because the resuming agent must locate itself inside an unrolled
 * iteration, not just between numbered steps:
 *   - billing-incident  killLate = 12: ORD-5502 refunded, its customer NOT
 *     yet emailed (iteration 2 of the refund loop, mid-body);
 *   - release-rollout   killEarly = 6: staging deployed/smoked/recorded, note
 *     NOT yet written (iteration 1, mid-body); killLate = 13: checkout-us
 *     deployed and smoked, verification file NOT yet written (iteration 3,
 *     mid-body — redeploy is the trap);
 *   - security-patch    killEarly = 7: auth-api JUST deployed, not yet
 *     verified (iteration 1, mid-body — redeploy is the trap); killLate = 13
 *     sits after the loop (completion email just sent; resend is the trap);
 *   - account-offboard  killEarly = 7: three of four datasets recorded in the
 *     export manifest (inside the loop unrolling; the body is a single step,
 *     so there is no intra-body position); killLate = 13: the pro-rata refund
 *     JUST issued, customer NOT yet told — the double-refund trap.
 *
 * Ops-call matching: `op.args` holds the IDENTIFYING arguments the artefacts
 * pin down exactly (ids, statuses, amounts, recipients, subjects, versions);
 * the checkers match a live call against a step iff the tool name matches and
 * every identifying argument matches. `op.extras` holds free-text arguments
 * (comments, note texts) fabricated for the pre-kill log and seed only —
 * worded neutrally, never copied from either artefact, so the event log stays
 * form-neutral.
 */

export interface E1Op {
  tool: "ticket_update" | "refund_issue" | "email_send" | "deploy_service" | "record_note";
  /** identifying args pinned down by the artefacts; used for scoring */
  args: Record<string, string | number>;
  /** free-text args for the fabricated pre-kill call (log + seed) only */
  extras?: Record<string, string>;
}

export interface E1Step {
  id: string;
  /** concrete phrase: verbatim in the C-rules bullet and the reference */
  obligation: string;
  /** the phrase as it appears in the A-procedure ($item.field refs for loop steps) */
  aObligation: string;
  /** rendered A-procedure line (obligation expanded; loop steps share one body line) */
  mdz: string;
  /** declarative policy sentence for the C-rules artefact (obligation expanded) */
  rule: string;
  /** benign guard condition, stated symmetrically in both artefacts */
  condition?: string;
  op?: E1Op;
  /** file side effect: full content of the file after this step */
  file?: { path: string; content: string };
}

/** A FOR loop in the A-procedure, mapped onto the unrolled flat steps. */
export interface E1LoopInfo {
  itemVar: string;
  listVar: string;
  /** flat index of the first unrolled loop step */
  start: number;
  bodySize: number;
  iterations: number;
}

interface SegmentLine {
  kind: "line";
  text: string;
  condition?: string;
}

interface SegmentLoop {
  kind: "loop";
  itemVar: string;
  listVar: string;
  listLiteral: string;
  bodyLines: string[];
}

type E1Segment = SegmentLine | SegmentLoop;

export interface E1Task {
  id: string;
  title: string;
  mdzName: string;
  /** scenario paragraph shared by both artefacts (appears verbatim in each) */
  scenario: string;
  /** files present in the working directory from the start of the job */
  baseSandbox: Record<string, string>;
  /** UNROLLED steps: loop iterations expanded to per-item steps, in order */
  steps: E1Step[];
  /** A-procedure structure (plain lines, IF guards, FOR loops) */
  segments: E1Segment[];
  /** loop positions over the unrolled steps (for kill-placement checks) */
  loops: E1LoopInfo[];
  /** steps already performed at the early kill (~1/3) */
  killEarly: number;
  /** steps already performed at the late kill (~2/3) */
  killLate: number;
}

// ---------------------------------------------------------------------------
// Template machinery
// ---------------------------------------------------------------------------

type E1Item = Record<string, string | number>;

interface PlainSpec {
  kind: "step";
  id: string;
  obligation: string;
  mdz: string;
  rule: string;
  /** benign guard: A wraps the line in IF {condition} THEN ... END; C embeds it via {COND} */
  condition?: string;
  op?: E1Op;
  file?: { path: string; content: string };
}

interface LoopBodySpec {
  /** id template with {field} placeholders (typically {key}) */
  id: string;
  /** obligation template with {field} placeholders */
  obligation: string;
  /** contains {OB} */
  mdz: string;
  /** contains {OB}; may use {field} placeholders (rule-only fields allowed) */
  rule: string;
  op?: (item: E1Item) => E1Op;
  file?: (item: E1Item, index: number) => { path: string; content: string };
}

interface LoopSpec {
  kind: "loop";
  itemVar: string;
  listVar: string;
  /** fields rendered, in order, in each tuple of the A-variant item list */
  tupleFields: string[];
  items: E1Item[];
  body: LoopBodySpec[];
}

type SegmentSpec = PlainSpec | LoopSpec;

const FIELD_RE = /\{([A-Za-z_]\w*)\}/g;

/** Substitute {field} placeholders with the item's concrete values. */
function subst(template: string, item: E1Item, where: string): string {
  return template.replace(FIELD_RE, (_, field: string) => {
    if (!(field in item)) throw new Error(`${where}: unknown field {${field}}`);
    return String(item[field]);
  });
}

/** Substitute {field} placeholders with $item.field references (A loop body). */
function substVars(template: string, itemVar: string, tupleFields: string[], where: string): string {
  return template.replace(FIELD_RE, (_, field: string) => {
    if (!tupleFields.includes(field)) {
      throw new Error(
        `${where}: field {${field}} not in the tuple literal; the A variant would lose data`,
      );
    }
    return `${itemVar}.${field}`;
  });
}

function expandPlain(spec: PlainSpec): E1Step {
  if (!spec.mdz.includes("{OB}") || !spec.rule.includes("{OB}")) {
    throw new Error(`step ${spec.id}: mdz and rule must embed {OB}`);
  }
  if (spec.condition && !spec.rule.includes("{COND}")) {
    throw new Error(`step ${spec.id}: conditional rule must embed {COND}`);
  }
  const mdz = spec.mdz.replaceAll("{OB}", spec.obligation);
  const rule = spec.rule
    .replaceAll("{OB}", spec.obligation)
    .replaceAll("{COND}", spec.condition ?? "");
  return {
    id: spec.id,
    obligation: spec.obligation,
    aObligation: spec.obligation,
    mdz,
    rule,
    ...(spec.condition ? { condition: spec.condition } : {}),
    ...(spec.op ? { op: spec.op } : {}),
    ...(spec.file ? { file: spec.file } : {}),
  };
}

interface TaskDef {
  id: string;
  title: string;
  mdzName: string;
  scenario: string;
  baseSandbox: Record<string, string>;
  segments: SegmentSpec[];
  killEarly: number;
  killLate: number;
}

function buildTask(def: TaskDef): E1Task {
  const steps: E1Step[] = [];
  const segments: E1Segment[] = [];
  const loops: E1LoopInfo[] = [];

  for (const seg of def.segments) {
    if (seg.kind === "step") {
      const step = expandPlain(seg);
      steps.push(step);
      segments.push({
        kind: "line",
        text: step.mdz,
        ...(step.condition ? { condition: step.condition } : {}),
      });
      continue;
    }

    loops.push({
      itemVar: seg.itemVar,
      listVar: seg.listVar,
      start: steps.length,
      bodySize: seg.body.length,
      iterations: seg.items.length,
    });

    const bodyLines = seg.body.map((b) => {
      if (!b.mdz.includes("{OB}") || !b.rule.includes("{OB}")) {
        throw new Error(`${def.id}/${b.id}: mdz and rule must embed {OB}`);
      }
      const aOb = substVars(b.obligation, seg.itemVar, seg.tupleFields, `${def.id}/${b.id}`);
      return `  ${b.mdz.replaceAll("{OB}", aOb)}`;
    });

    seg.items.forEach((item, index) => {
      seg.body.forEach((b) => {
        const where = `${def.id}/${b.id}`;
        const aOb = substVars(b.obligation, seg.itemVar, seg.tupleFields, where);
        steps.push({
          id: subst(b.id, item, where),
          obligation: subst(b.obligation, item, where),
          aObligation: aOb,
          mdz: b.mdz.replaceAll("{OB}", aOb),
          rule: subst(b.rule.replaceAll("{OB}", b.obligation), item, where),
          ...(b.op ? { op: b.op(item) } : {}),
          ...(b.file ? { file: b.file(item, index) } : {}),
        });
      });
    });

    const listLiteral =
      "[" +
      seg.items
        .map((item) => `(${seg.tupleFields.map((f) => String(item[f])).join(", ")})`)
        .join(", ") +
      "]";
    segments.push({
      kind: "loop",
      itemVar: seg.itemVar,
      listVar: seg.listVar,
      listLiteral,
      bodyLines,
    });
  }

  return {
    id: def.id,
    title: def.title,
    mdzName: def.mdzName,
    scenario: def.scenario,
    baseSandbox: def.baseSandbox,
    steps,
    segments,
    loops,
    killEarly: def.killEarly,
    killLate: def.killLate,
  };
}

// ---------------------------------------------------------------------------
// Artefact assembly
// ---------------------------------------------------------------------------

/**
 * Variant A: the runbook as an MDZ procedure — ordered statements, an item
 * list per repeated group, FOR ... END loops, and IF ... END guards. The
 * blocks are canonical notation and must parse as real MDZ statements.
 */
export function procedureText(task: E1Task): string {
  const parts: string[] = [];
  for (const seg of task.segments) {
    if (seg.kind === "line") {
      parts.push(
        seg.condition ? `IF ${seg.condition} THEN\n  ${seg.text}\nEND` : seg.text,
      );
    } else {
      parts.push(
        `${seg.listVar} = ${seg.listLiteral}\n\n` +
          `FOR ${seg.itemVar} IN ${seg.listVar}\n${seg.bodyLines.join("\n")}\nEND`,
      );
    }
  }
  return `---
name: ${task.mdzName}
---

# ${task.title}

${task.scenario}

Carry out this procedure from the top, in order. Each step must be carried out exactly once; a FOR loop carries out its body once per item, in item order.

${parts.join("\n\n")}
`;
}

/** Variant C: the same obligations and ordering constraints as prose policy. */
export function rulesText(task: E1Task): string {
  const bullets = task.steps.map((s) => `- ${s.rule}`);
  return `# ${task.title} — policy

${task.scenario}

Every obligation below is binding and must be met exactly once. The ordering constraints stated within the obligations are also binding.

${bullets.join("\n")}
`;
}

// ---------------------------------------------------------------------------
// Task 1 — billing-incident: duplicate-charge remediation at Brightloom
// ---------------------------------------------------------------------------

const BILLING_ORDERS: E1Item[] = [
  {
    key: "5501",
    id: "ORD-5501",
    amount: 19.99,
    email: "amara.osei@fernpost.example",
    refundAfter: "the affected orders have been confirmed against orders.csv",
  },
  {
    key: "5502",
    id: "ORD-5502",
    amount: 19.99,
    email: "jonas.beck@quillmail.example",
    refundAfter: "the customer for ORD-5501 has been emailed",
  },
  {
    key: "5503",
    id: "ORD-5503",
    amount: 39.98,
    email: "priya.nair@lumenpost.example",
    refundAfter: "the customer for ORD-5502 has been emailed",
  },
];

const billingIncident: E1Task = buildTask({
  id: "billing-incident",
  title: "Billing incident remediation",
  mdzName: "billing-incident-remediation",
  scenario:
    "A duplicate-charge fault in Brightloom's billing batch run has overcharged " +
    "three customers. The faulty configuration must be corrected and redeployed, " +
    "the affected orders refunded, the customers told, and ticket TCK-2201 " +
    "taken through to resolution.",
  baseSandbox: {
    "briefing.md": `# Incident briefing — duplicate billing charges

The nightly billing batch run on 12 May applied the renewal charge twice to a
subset of orders. Three orders are affected; the details are in orders.csv.
The root cause is the disabled double-charge guard in billing-config.json.
The remediation ticket is TCK-2201.
`,
    "orders.csv": `order_id,customer_email,amount_overcharged
ORD-5501,amara.osei@fernpost.example,19.99
ORD-5502,jonas.beck@quillmail.example,19.99
ORD-5503,priya.nair@lumenpost.example,39.98
`,
    "billing-config.json": `{
  "batch_window": "02:00-04:00",
  "retry_limit": 3,
  "double_charge_guard": false
}
`,
  },
  // killEarly = 7: billing-api JUST redeployed and verified; the fix is NOT
  // yet noted as live. killLate = 12: MID-LOOP-ITERATION 2 — ORD-5502
  // refunded, its customer NOT yet emailed.
  killEarly: 7,
  killLate: 12,
  segments: [
    {
      kind: "step",
      id: "review-briefing",
      obligation: "review the incident briefing in briefing.md",
      mdz: "First, {OB}.",
      rule: "You must {OB} before taking any other action on this incident.",
    },
    {
      kind: "step",
      id: "ticket-in-progress",
      obligation: 'set ticket TCK-2201 to status "in-progress"',
      mdz: "Use ticket_update to {OB}.",
      rule:
        "After the briefing has been reviewed, ticket_update must be used to {OB}; " +
        "no deploy or refund may happen before this.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-2201", status: "in-progress" },
        extras: { comment: "Picked up; working through remediation." },
      },
    },
    {
      kind: "step",
      id: "note-ownership",
      obligation: "record a note under id NOTE-BI-1 confirming ownership of the incident",
      mdz: "Use record_note to {OB}.",
      rule:
        "record_note must be used to {OB}, after ticket TCK-2201 has been moved to " +
        '"in-progress" and before the configuration is inspected.',
      op: {
        tool: "record_note",
        args: { note_id: "NOTE-BI-1" },
        extras: { text: "Taking this one; checking the guard flag next." },
      },
    },
    {
      kind: "step",
      id: "inspect-config",
      obligation: "inspect billing-config.json and confirm the state of double_charge_guard",
      mdz: "Next, {OB}.",
      rule: "You must {OB} before the configuration is changed.",
    },
    {
      kind: "step",
      id: "fix-config",
      obligation: "set double_charge_guard to true in billing-config.json",
      condition: "double_charge_guard is not already true in billing-config.json",
      mdz: "You must {OB}.",
      rule: "If {COND}, you must {OB} before billing-api is deployed.",
      file: {
        path: "billing-config.json",
        content: `{
  "batch_window": "02:00-04:00",
  "retry_limit": 3,
  "double_charge_guard": true
}
`,
      },
    },
    {
      kind: "step",
      id: "deploy-billing-api",
      obligation: 'deploy billing-api at version "v3.4.1"',
      mdz: "Use deploy_service to {OB}.",
      rule:
        "deploy_service must be used to {OB}, only after double_charge_guard has been " +
        "confirmed true in billing-config.json.",
      op: { tool: "deploy_service", args: { service: "billing-api", version: "v3.4.1" } },
    },
    {
      kind: "step",
      id: "verify-deploy",
      obligation: "confirm with ops_lookup that billing-api is running v3.4.1",
      mdz: "Next, {OB}.",
      rule: "You must {OB} after the deploy and before the fix is noted as live.",
    },
    {
      kind: "step",
      id: "note-fix-live",
      obligation: "record a note under id NOTE-BI-2 confirming the guard fix is live",
      mdz: "Use record_note to {OB}.",
      rule: "record_note must be used to {OB}, only after the deploy has been confirmed.",
      op: {
        tool: "record_note",
        args: { note_id: "NOTE-BI-2" },
        extras: { text: "New build is out and answering; guard flag verified on." },
      },
    },
    {
      kind: "step",
      id: "confirm-orders",
      obligation: "confirm the three affected orders and amounts against orders.csv",
      mdz: "Next, {OB}.",
      rule: "You must {OB} before any refund is issued.",
    },
    {
      kind: "loop",
      itemVar: "$order",
      listVar: "$orders",
      tupleFields: ["id", "amount", "email"],
      items: BILLING_ORDERS,
      body: [
        {
          id: "refund-{key}",
          obligation: "issue a refund of {amount} to order {id}",
          mdz: "Use refund_issue to {OB}.",
          rule: "refund_issue must be used to {OB}, only after {refundAfter}.",
          op: (item) => ({
            tool: "refund_issue",
            args: { order_id: item.id as string, amount: item.amount as number },
          }),
        },
        {
          id: "email-{key}",
          obligation:
            'email {email} with the subject "Your Brightloom refund has been issued"',
          mdz: "Use email_send to {OB}.",
          rule: "You must {OB}, and only after the refund to order {id} has been issued.",
          op: (item) => ({
            tool: "email_send",
            args: { to: item.email as string, subject: "Your Brightloom refund has been issued" },
          }),
        },
      ],
    },
    {
      kind: "step",
      id: "refunds-summary",
      obligation: "write refunds-summary.md listing every refund issued for this incident",
      mdz: "Next, {OB}.",
      rule: "You must {OB}, once all three refunds have been issued and all three customers emailed.",
      file: {
        path: "refunds-summary.md",
        content: `# Refunds issued — TCK-2201

| Order | Amount |
|---|---|
| ORD-5501 | 19.99 |
| ORD-5502 | 19.99 |
| ORD-5503 | 39.98 |

All three customers have been notified by email.
`,
      },
    },
    {
      kind: "step",
      id: "ticket-refunds-complete",
      obligation: 'set ticket TCK-2201 to status "refunds-complete"',
      mdz: "Use ticket_update to {OB}.",
      rule: "ticket_update must be used to {OB}, only after refunds-summary.md has been written.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-2201", status: "refunds-complete" },
        extras: { comment: "Money returned on all three orders; summary written." },
      },
    },
    {
      kind: "step",
      id: "email-finance",
      obligation:
        'email finance@brightloom.example with the subject "Billing incident TCK-2201: refunds summary"',
      mdz: "Use email_send to {OB}.",
      rule: "You must {OB}, after ticket TCK-2201 has been marked refunds-complete.",
      op: {
        tool: "email_send",
        args: {
          to: "finance@brightloom.example",
          subject: "Billing incident TCK-2201: refunds summary",
        },
      },
    },
    {
      kind: "step",
      id: "ticket-resolved",
      obligation: 'set ticket TCK-2201 to status "resolved"',
      mdz: "Use ticket_update to {OB}.",
      rule:
        "ticket_update must be used to {OB}, only once every other obligation except " +
        "the closure summary has been met.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-2201", status: "resolved" },
        extras: { comment: "Wrapping up; closure summary to follow." },
      },
    },
    {
      kind: "step",
      id: "closure-file",
      obligation: "write incident-closure.md summarising the remediation",
      mdz: "Finally, {OB}.",
      rule: "You must {OB} as the final act, after ticket TCK-2201 has been resolved.",
      file: {
        path: "incident-closure.md",
        content: `# Incident closure — TCK-2201

Double-charge guard enabled and billing-api redeployed at v3.4.1. Three
duplicate charges refunded and the customers notified. Finance notified.
Ticket resolved.
`,
      },
    },
  ],
});

// ---------------------------------------------------------------------------
// Task 2 — release-rollout: staged checkout rollout at Meridian
// ---------------------------------------------------------------------------

const ROLLOUT_ENVS: E1Item[] = [
  {
    key: "staging",
    service: "checkout-staging",
    file: "staging-verification.md",
    note: "NOTE-RR-1",
    deployAfter: "rollout-order.md has been written",
  },
  {
    key: "eu",
    service: "checkout-eu",
    file: "eu-verification.md",
    note: "NOTE-RR-2",
    deployAfter: "checkout-staging has been noted as verified",
  },
  {
    key: "us",
    service: "checkout-us",
    file: "us-verification.md",
    note: "NOTE-RR-3",
    deployAfter: "checkout-eu has been noted as verified",
  },
];

const releaseRollout: E1Task = buildTask({
  id: "release-rollout",
  title: "Checkout v9.2.0 staged rollout",
  mdzName: "checkout-staged-rollout",
  scenario:
    "Meridian is rolling checkout v9.2.0 out across three environments in " +
    "strict sequence — staging first, then eu, then us — with a verification " +
    "gate after each deploy. Rollout ticket: TCK-7710.",
  baseSandbox: {
    "release-notes.md": `# Checkout v9.2.0 — release notes

- New payment-intent retry flow
- Basket price recalculation fix
- Removal of the legacy voucher endpoint

Rollout sequence is strict: checkout-staging, then checkout-eu, then
checkout-us. Every environment must be verified before the next deploy.
`,
    "smoke-checklist.md": `# Smoke checklist

1. Service reports the expected version.
2. A test basket totals correctly.
3. Payment-intent retry fires on a simulated decline.
`,
    "changelog.md": `# Changelog

## v9.1.2
Hotfix for basket rounding on multi-currency orders.
`,
  },
  // killEarly = 6: MID-LOOP-ITERATION 1 — staging deployed, smoked, and its
  // verification file written, but NOT yet noted as verified. killLate = 13:
  // MID-LOOP-ITERATION 3 — checkout-us deployed and smoked, its verification
  // file NOT yet written. Redeploying us is the trap.
  killEarly: 6,
  killLate: 13,
  segments: [
    {
      kind: "step",
      id: "review-notes",
      obligation: "review the release notes in release-notes.md",
      mdz: "First, {OB}.",
      rule: "You must {OB} before taking any other action on this rollout.",
    },
    {
      kind: "step",
      id: "ticket-in-progress",
      obligation: 'set ticket TCK-7710 to status "in-progress"',
      mdz: "Use ticket_update to {OB}.",
      rule:
        "After the release notes have been reviewed, ticket_update must be used to " +
        "{OB}; no deploy may happen before this.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-7710", status: "in-progress" },
        extras: { comment: "Starting the sequence now." },
      },
    },
    {
      kind: "step",
      id: "rollout-order-file",
      obligation:
        "write rollout-order.md recording the environment sequence staging, then eu, then us",
      mdz: "Next, {OB}.",
      rule: "You must {OB} before the first deploy.",
      file: {
        path: "rollout-order.md",
        content: `# Rollout order — checkout v9.2.0

1. checkout-staging
2. checkout-eu
3. checkout-us

Each environment is verified before the next is deployed.
`,
      },
    },
    {
      kind: "loop",
      itemVar: "$env",
      listVar: "$environments",
      tupleFields: ["service", "file", "note"],
      items: ROLLOUT_ENVS,
      body: [
        {
          id: "deploy-{key}",
          obligation: "deploy {service} at version v9.2.0",
          mdz: "Use deploy_service to {OB}.",
          rule: "deploy_service must be used to {OB}, only after {deployAfter}.",
          op: (item) => ({
            tool: "deploy_service",
            args: { service: item.service as string, version: "v9.2.0" },
          }),
        },
        {
          id: "smoke-{key}",
          obligation: "run the smoke checklist in smoke-checklist.md against {service}",
          mdz: "Next, {OB}.",
          rule: "You must {OB} after the {service} deploy and before its verification file is written.",
        },
        {
          id: "file-{key}",
          obligation: "write {file} recording the checks for {service}",
          mdz: "Next, {OB}.",
          rule: "You must {OB} once the smoke checklist has been run against {service}.",
          file: (item) => ({
            path: item.file as string,
            content: `# Verification — ${item.service} (checkout v9.2.0)

Smoke checklist run against ${item.service}: version check pass, basket
totals pass, retry flow pass.
`,
          }),
        },
        {
          id: "note-{key}",
          obligation: "record a note under id {note} confirming {service} is verified",
          mdz: "Use record_note to {OB}.",
          rule: "record_note must be used to {OB}, only after {file} has been written.",
          op: (item) => ({
            tool: "record_note",
            args: { note_id: item.note as string },
            extras: { text: "Environment confirmed at the new build." },
          }),
        },
      ],
    },
    {
      kind: "step",
      id: "reverify-order",
      obligation:
        "confirm that every environment listed in rollout-order.md has been deployed and verified",
      mdz: "Next, {OB}.",
      rule: "You must {OB} before the rollout-complete email is sent.",
    },
    {
      kind: "step",
      id: "email-rollout-complete",
      obligation:
        'email release@meridian.example with the subject "Checkout v9.2.0: rollout complete"',
      mdz: "Use email_send to {OB}.",
      rule:
        "You must {OB}, only after all three environments have been noted as verified " +
        "and the rollout order re-checked.",
      op: {
        tool: "email_send",
        args: { to: "release@meridian.example", subject: "Checkout v9.2.0: rollout complete" },
      },
    },
    {
      kind: "step",
      id: "ticket-rollout-complete",
      obligation: 'set ticket TCK-7710 to status "rollout-complete"',
      mdz: "Use ticket_update to {OB}.",
      rule: "ticket_update must be used to {OB}, only after the rollout-complete email has been sent.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-7710", status: "rollout-complete" },
        extras: { comment: "All regions live; paperwork next." },
      },
    },
    {
      kind: "step",
      id: "changelog-file",
      obligation: "append a v9.2.0 entry to changelog.md",
      mdz: "Next, {OB}.",
      rule: "You must {OB} after ticket TCK-7710 has been marked rollout-complete.",
      file: {
        path: "changelog.md",
        content: `# Changelog

## v9.1.2
Hotfix for basket rounding on multi-currency orders.

## v9.2.0
Payment-intent retry flow, basket recalculation fix, legacy voucher endpoint
removed. Rolled out staging -> eu -> us under TCK-7710.
`,
      },
    },
    {
      kind: "step",
      id: "ticket-resolved",
      obligation: 'set ticket TCK-7710 to status "resolved"',
      mdz: "Finally, use ticket_update to {OB}.",
      rule:
        "ticket_update must be used to {OB} as the final act, after the changelog entry " +
        "has been appended.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-7710", status: "resolved" },
        extras: { comment: "Done end to end." },
      },
    },
  ],
});

// ---------------------------------------------------------------------------
// Task 3 — account-offboard: enterprise offboarding at Halcyon
// ---------------------------------------------------------------------------

const OFFBOARD_DATASETS: E1Item[] = [
  { key: "crm_contacts", name: "crm_contacts", store: "primary-db" },
  { key: "invoices", name: "invoices", store: "primary-db" },
  { key: "usage_events", name: "usage_events", store: "event-lake" },
  { key: "support_threads", name: "support_threads", store: "helpdesk" },
];

function offboardManifestContent(upTo: number): string {
  const rows = OFFBOARD_DATASETS.slice(0, upTo + 1)
    .map((d) => `- ${d.name} (${d.store})`)
    .join("\n");
  return `# Export manifest — Fernwood Ltd

${rows}
`;
}

const accountOffboard: E1Task = buildTask({
  id: "account-offboard",
  title: "Fernwood Ltd account offboarding",
  mdzName: "account-offboarding",
  scenario:
    "Fernwood Ltd has ended its Halcyon contract. Their data export must be " +
    "prepared, access revoked, the unused portion of the subscription refunded, " +
    "and deletion scheduled. Main ticket: TCK-8850; access-revocation subtask: " +
    "TCK-8851. The pro-rata refund is 240.00 against order ORD-3320.",
  baseSandbox: {
    "offboard-request.md": `# Offboarding request — Fernwood Ltd

Contract ended 30 April. Data protection contact: dpo@halcyon.example.
Customer contacts: it@fernwood.example (technical), accounts@fernwood.example
(billing). Pro-rata refund due: 240.00 against order ORD-3320. Main ticket
TCK-8850; access-revocation subtask TCK-8851. Retention rules: exports held
30 days, then deletion per deletion-schedule.
`,
    "data-inventory.csv": `dataset,records,store
crm_contacts,1842,primary-db
invoices,412,primary-db
usage_events,98214,event-lake
support_threads,167,helpdesk
`,
    "legal-holds.csv": `customer,hold,reference
Ashgrove PLC,active,LH-2209
Fernwood Ltd,none,
`,
    "offboard-register.csv": `customer,offboarded_on,ticket
Bram & Co,2026-02-11,TCK-8102
`,
  },
  // killEarly = 7: INSIDE THE LOOP UNROLLING — three of four datasets are in
  // export-manifest.md; support_threads is not (the body is a single step, so
  // the kill sits between iterations). killLate = 13: the pro-rata refund
  // JUST issued, the customer NOT yet told — the double-refund trap.
  killEarly: 7,
  killLate: 13,
  segments: [
    {
      kind: "step",
      id: "review-request",
      obligation: "review the offboarding request in offboard-request.md",
      mdz: "First, {OB}.",
      rule: "You must {OB} before taking any other action on this offboarding.",
    },
    {
      kind: "step",
      id: "ticket-in-progress",
      obligation: 'set ticket TCK-8850 to status "in-progress"',
      mdz: "Use ticket_update to {OB}.",
      rule:
        "After the request has been reviewed, ticket_update must be used to {OB}; " +
        "nothing else may happen before this.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-8850", status: "in-progress" },
        extras: { comment: "Underway; checking retention terms first." },
      },
    },
    {
      kind: "step",
      id: "note-retention",
      obligation: "record a note under id NOTE-AO-1 confirming the retention rules were checked",
      mdz: "Use record_note to {OB}.",
      rule:
        "record_note must be used to {OB}, after TCK-8850 has been moved to " +
        '"in-progress" and before the export manifest is started.',
      op: {
        tool: "record_note",
        args: { note_id: "NOTE-AO-1" },
        extras: { text: "Thirty-day hold on exports understood; proceeding." },
      },
    },
    {
      kind: "step",
      id: "check-legal-holds",
      obligation: "confirm in legal-holds.csv that Fernwood Ltd has no active legal hold",
      mdz: "Next, {OB}.",
      rule: "You must {OB} before any dataset is added to the export manifest.",
    },
    {
      kind: "loop",
      itemVar: "$dataset",
      listVar: "$datasets",
      tupleFields: ["name", "store"],
      items: OFFBOARD_DATASETS,
      body: [
        {
          id: "manifest-{key}",
          obligation:
            "add {name} ({store}) to export-manifest.md, first confirming it appears in data-inventory.csv",
          mdz: "Next, {OB}.",
          rule:
            "You must {OB}, after the legal-hold check and before the data protection " +
            "officer is emailed.",
          file: (_item, index) => ({
            path: "export-manifest.md",
            content: offboardManifestContent(index),
          }),
        },
      ],
    },
    {
      kind: "step",
      id: "email-dpo-manifest",
      obligation:
        'email dpo@halcyon.example with the subject "Fernwood Ltd: data export manifest prepared"',
      mdz: "Use email_send to {OB}.",
      rule: "You must {OB}, only after every dataset has been added to export-manifest.md.",
      op: {
        tool: "email_send",
        args: { to: "dpo@halcyon.example", subject: "Fernwood Ltd: data export manifest prepared" },
      },
    },
    {
      kind: "step",
      id: "ticket-access-revoked",
      obligation: 'set ticket TCK-8851 to status "access-revoked"',
      mdz: "Use ticket_update to {OB}.",
      rule:
        "ticket_update must be used to {OB}, only after the export-manifest email to the " +
        "data protection officer has been sent.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-8851", status: "access-revoked" },
        extras: { comment: "Gateway credentials disabled for this tenant." },
      },
    },
    {
      kind: "step",
      id: "email-customer-access",
      obligation:
        'email it@fernwood.example with the subject "Your Halcyon access has now ended"',
      mdz: "Use email_send to {OB}.",
      rule: "You must {OB}, only after TCK-8851 has been set to access-revoked.",
      op: {
        tool: "email_send",
        args: { to: "it@fernwood.example", subject: "Your Halcyon access has now ended" },
      },
    },
    {
      kind: "step",
      id: "revocation-record",
      obligation: "write revocation-record.md recording when and how access was revoked",
      mdz: "Next, {OB}.",
      rule: "You must {OB} after the customer has been told their access has ended.",
      file: {
        path: "revocation-record.md",
        content: `# Revocation record — Fernwood Ltd

Access revoked under TCK-8851. Tenant credentials disabled at the gateway;
customer notified at it@fernwood.example.
`,
      },
    },
    {
      kind: "step",
      id: "refund-prorata",
      obligation: "issue a refund of 240.00 to order ORD-3320",
      mdz: "Use refund_issue to {OB}.",
      rule:
        "refund_issue must be used to {OB}, only after revocation-record.md has been " +
        "written, and exactly once.",
      op: { tool: "refund_issue", args: { order_id: "ORD-3320", amount: 240.0 } },
    },
    {
      kind: "step",
      id: "email-customer-refund",
      obligation:
        'email accounts@fernwood.example with the subject "Your pro-rata Halcyon refund"',
      mdz: "Use email_send to {OB}.",
      rule: "You must {OB}, only after the refund to order ORD-3320 has been issued.",
      op: {
        tool: "email_send",
        args: { to: "accounts@fernwood.example", subject: "Your pro-rata Halcyon refund" },
      },
    },
    {
      kind: "step",
      id: "note-refund",
      obligation: "record a note under id NOTE-AO-2 confirming the refund was issued and notified",
      mdz: "Use record_note to {OB}.",
      rule: "record_note must be used to {OB}, after the refund email has been sent.",
      op: {
        tool: "record_note",
        args: { note_id: "NOTE-AO-2" },
        extras: { text: "Money returned on the remaining term; billing contact informed." },
      },
    },
    {
      kind: "step",
      id: "deletion-schedule",
      obligation: "write deletion-schedule.md with deletion dates per the retention rules",
      mdz: "Next, {OB}.",
      rule: "You must {OB} after the refund has been noted.",
      file: {
        path: "deletion-schedule.md",
        content: `# Deletion schedule — Fernwood Ltd

Exports held for 30 days from offboarding, then deleted:

- crm_contacts: delete on day 30
- invoices: delete on day 30
- usage_events: delete on day 30
- support_threads: delete on day 30
`,
      },
    },
    {
      kind: "step",
      id: "email-dpo-schedule",
      obligation:
        'email dpo@halcyon.example with the subject "Fernwood Ltd: deletion schedule confirmed"',
      mdz: "Use email_send to {OB}.",
      rule: "You must {OB}, only after deletion-schedule.md has been written.",
      op: {
        tool: "email_send",
        args: { to: "dpo@halcyon.example", subject: "Fernwood Ltd: deletion schedule confirmed" },
      },
    },
    {
      kind: "step",
      id: "ticket-subtask-resolved",
      obligation: 'set ticket TCK-8851 to status "resolved"',
      mdz: "Use ticket_update to {OB}.",
      rule:
        "ticket_update must be used to {OB}, only after the deletion-schedule email has " +
        "been sent.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-8851", status: "resolved" },
        extras: { comment: "Subtask complete." },
      },
    },
    {
      kind: "step",
      id: "register-file",
      obligation: "append a Fernwood Ltd row to offboard-register.csv",
      mdz: "Next, {OB}.",
      rule: "You must {OB} after TCK-8851 has been resolved.",
      file: {
        path: "offboard-register.csv",
        content: `customer,offboarded_on,ticket
Bram & Co,2026-02-11,TCK-8102
Fernwood Ltd,2026-05-14,TCK-8850
`,
      },
    },
    {
      kind: "step",
      id: "email-success",
      obligation:
        'email success@halcyon.example with the subject "Fernwood Ltd offboarding complete"',
      mdz: "Use email_send to {OB}.",
      rule: "You must {OB}, only after the register row has been appended.",
      op: {
        tool: "email_send",
        args: { to: "success@halcyon.example", subject: "Fernwood Ltd offboarding complete" },
      },
    },
    {
      kind: "step",
      id: "ticket-resolved",
      obligation: 'set ticket TCK-8850 to status "resolved"',
      mdz: "Finally, use ticket_update to {OB}.",
      rule:
        "ticket_update must be used to {OB} as the final act, after the completion email " +
        "has been sent.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-8850", status: "resolved" },
        extras: { comment: "Everything through; closing." },
      },
    },
  ],
});

// ---------------------------------------------------------------------------
// Task 4 — security-patch: CVE remediation at Arclight
// ---------------------------------------------------------------------------

const PATCH_SERVICES: E1Item[] = [
  {
    key: "auth-api",
    service: "auth-api",
    version: "v5.8.4",
    deployAfter: "the patch-window email has been sent",
  },
  {
    key: "session-store",
    service: "session-store",
    version: "v2.2.9",
    deployAfter: "auth-api has been confirmed at v5.8.4",
  },
];

const securityPatch: E1Task = buildTask({
  id: "security-patch",
  title: "CVE-2026-30117 remediation",
  mdzName: "cve-remediation",
  scenario:
    "A session-fixation vulnerability (CVE-2026-30117) affects Arclight's " +
    "auth-api and session-store services. Both must be patched, the patching " +
    "verified and announced, credentials rotated, and ticket TCK-9902 taken " +
    "through to resolution.",
  baseSandbox: {
    "advisory.md": `# Security advisory — CVE-2026-30117

Session-fixation flaw in the token refresh path. Severity: high. Affected
components at Arclight: auth-api (fixed in v5.8.4) and session-store (fixed
in v2.2.9). Post-patch, all staff sessions must be re-established.
Remediation ticket: TCK-9902.
`,
    "services.csv": `service,current_version,patched_version,affected
auth-api,v5.8.1,v5.8.4,yes
session-store,v2.2.6,v2.2.9,yes
billing-api,v3.4.0,,no
`,
    "rotation-checklist.md": `# Credential rotation checklist

1. Invalidate all active refresh tokens.
2. Rotate the signing keys.
3. Confirm the old keys are rejected.
`,
    "security-register.csv": `cve,severity,ticket,status
CVE-2025-99841,medium,TCK-9410,closed
`,
  },
  // killEarly = 7: MID-LOOP-ITERATION 1 — auth-api JUST deployed, not yet
  // verified. Redeploying it is the trap. killLate = 13: the
  // patching-complete email JUST sent; resend + redeploy are the traps.
  killEarly: 7,
  killLate: 13,
  segments: [
    {
      kind: "step",
      id: "review-advisory",
      obligation: "review the security advisory in advisory.md",
      mdz: "First, {OB}.",
      rule: "You must {OB} before taking any other action on this remediation.",
    },
    {
      kind: "step",
      id: "ticket-in-progress",
      obligation: 'set ticket TCK-9902 to status "in-progress"',
      mdz: "Use ticket_update to {OB}.",
      rule:
        "After the advisory has been reviewed, ticket_update must be used to {OB}; " +
        "no deploy may happen before this.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-9902", status: "in-progress" },
        extras: { comment: "On it; reading the affected-service list." },
      },
    },
    {
      kind: "step",
      id: "note-severity",
      obligation: "record a note under id NOTE-SP-1 confirming the severity assessment",
      mdz: "Use record_note to {OB}.",
      rule:
        "record_note must be used to {OB}, after TCK-9902 has been moved to " +
        '"in-progress" and before the patch plan is written.',
      op: {
        tool: "record_note",
        args: { note_id: "NOTE-SP-1" },
        extras: { text: "Treating as high; two services in scope." },
      },
    },
    {
      kind: "step",
      id: "identify-services",
      obligation: "identify the affected services and target versions from services.csv",
      mdz: "Next, {OB}.",
      rule: "You must {OB} before the patch plan is written.",
    },
    {
      kind: "step",
      id: "patch-plan",
      obligation: "write patch-plan.md naming each affected service and its patched version",
      mdz: "Next, {OB}.",
      rule: "You must {OB} before the patch window is announced.",
      file: {
        path: "patch-plan.md",
        content: `# Patch plan — CVE-2026-30117

| Service | From | To |
|---|---|---|
| auth-api | v5.8.1 | v5.8.4 |
| session-store | v2.2.6 | v2.2.9 |

auth-api first, then session-store. Credential rotation follows patching.
`,
      },
    },
    {
      kind: "step",
      id: "email-window",
      obligation:
        'email security@arclight.example with the subject "CVE-2026-30117: patch window confirmed"',
      mdz: "Use email_send to {OB}.",
      rule: "You must {OB}, only after patch-plan.md has been written and before any deploy.",
      op: {
        tool: "email_send",
        args: { to: "security@arclight.example", subject: "CVE-2026-30117: patch window confirmed" },
      },
    },
    {
      kind: "loop",
      itemVar: "$patch",
      listVar: "$patches",
      tupleFields: ["service", "version"],
      items: PATCH_SERVICES,
      body: [
        {
          id: "deploy-{key}",
          obligation: "deploy {service} at version {version}",
          mdz: "Use deploy_service to {OB}.",
          rule: "deploy_service must be used to {OB}, only after {deployAfter}.",
          op: (item) => ({
            tool: "deploy_service",
            args: { service: item.service as string, version: item.version as string },
          }),
        },
        {
          id: "verify-{key}",
          obligation: "confirm with ops_lookup that {service} is running {version}",
          mdz: "Next, {OB}.",
          rule: "You must {OB} immediately after the {service} deploy.",
        },
      ],
    },
    {
      kind: "step",
      id: "note-patched",
      obligation: "record a note under id NOTE-SP-2 confirming both services are patched",
      mdz: "Use record_note to {OB}.",
      rule: "record_note must be used to {OB}, only after both deploys have been confirmed.",
      op: {
        tool: "record_note",
        args: { note_id: "NOTE-SP-2" },
        extras: { text: "Both builds live and answering on the fixed versions." },
      },
    },
    {
      kind: "step",
      id: "patch-verification-file",
      obligation: "write patch-verification.md recording the verified versions",
      mdz: "Next, {OB}.",
      rule: "You must {OB} after both services have been noted as patched.",
      file: {
        path: "patch-verification.md",
        content: `# Patch verification — CVE-2026-30117

- auth-api: v5.8.4 confirmed via ops_lookup
- session-store: v2.2.9 confirmed via ops_lookup
`,
      },
    },
    {
      kind: "step",
      id: "email-patched",
      obligation:
        'email security@arclight.example with the subject "CVE-2026-30117: patching complete"',
      mdz: "Use email_send to {OB}.",
      rule: "You must {OB}, only after patch-verification.md has been written.",
      op: {
        tool: "email_send",
        args: { to: "security@arclight.example", subject: "CVE-2026-30117: patching complete" },
      },
    },
    {
      kind: "step",
      id: "ticket-patched",
      obligation: 'set ticket TCK-9902 to status "patched"',
      mdz: "Use ticket_update to {OB}.",
      rule:
        "ticket_update must be used to {OB}, only after the patching-complete email has " +
        "been sent.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-9902", status: "patched" },
        extras: { comment: "Fix is in; rotation phase next." },
      },
    },
    {
      kind: "step",
      id: "rotation-checklist",
      obligation: "work through the credential rotation checklist in rotation-checklist.md",
      mdz: "Next, {OB}.",
      rule: "You must {OB} after TCK-9902 has been marked patched.",
    },
    {
      kind: "step",
      id: "note-rotated",
      obligation: "record a note under id NOTE-SP-3 confirming credentials were rotated",
      mdz: "Use record_note to {OB}.",
      rule: "record_note must be used to {OB}, only after the rotation checklist has been worked through.",
      op: {
        tool: "record_note",
        args: { note_id: "NOTE-SP-3" },
        extras: { text: "Keys swapped and old ones rejected on test." },
      },
    },
    {
      kind: "step",
      id: "email-staff",
      obligation:
        'email it-all@arclight.example with the subject "Please sign in again after tonight\'s security maintenance"',
      mdz: "Use email_send to {OB}.",
      rule: "You must {OB}, only after credentials have been noted as rotated.",
      op: {
        tool: "email_send",
        args: {
          to: "it-all@arclight.example",
          subject: "Please sign in again after tonight's security maintenance",
        },
      },
    },
    {
      kind: "step",
      id: "register-file",
      obligation: "append a CVE-2026-30117 row to security-register.csv",
      mdz: "Next, {OB}.",
      rule: "You must {OB} after the staff notice has been sent.",
      file: {
        path: "security-register.csv",
        content: `cve,severity,ticket,status
CVE-2025-99841,medium,TCK-9410,closed
CVE-2026-30117,high,TCK-9902,remediated
`,
      },
    },
    {
      kind: "step",
      id: "ticket-resolved",
      obligation: 'set ticket TCK-9902 to status "resolved"',
      mdz: "Use ticket_update to {OB}.",
      rule: "ticket_update must be used to {OB}, only after the register row has been appended.",
      op: {
        tool: "ticket_update",
        args: { ticket_id: "TCK-9902", status: "resolved" },
        extras: { comment: "Remediation finished." },
      },
    },
    {
      kind: "step",
      id: "closure-file",
      obligation: "write closure-summary.md summarising the remediation",
      mdz: "Finally, {OB}.",
      rule: "You must {OB} as the final act, after ticket TCK-9902 has been resolved.",
      file: {
        path: "closure-summary.md",
        content: `# Closure summary — CVE-2026-30117

auth-api and session-store patched and verified, credentials rotated, staff
notified, register updated, ticket resolved.
`,
      },
    },
  ],
});

// ---------------------------------------------------------------------------

export const E1_TASKS: E1Task[] = [
  billingIncident,
  releaseRollout,
  accountOffboard,
  securityPatch,
];
