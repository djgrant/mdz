/**
 * E4 — handwritten procedure-vs-goal tasks.
 *
 * Each task is built so that a helpful model's default answer is plausible but
 * violates the stated policy, and the violation is mechanically checkable.
 * The shared input fixes the output format (a decision line or a labelled
 * list) so the goal-only arm can also be scored deterministically.
 *
 * The sample answers are fixtures for the checker tests: `nonCompliantSample`
 * is the intuitive helpful-but-wrong answer a model tends to give;
 * `compliantSample` follows the procedure.
 */

export interface E4Task {
  id: string;
  /** material both arms operate on, including the required output format */
  input: string;
  /** arm B: goal-only framing */
  goal: string;
  /** arm A: the full MDZ procedure document */
  procedure: string;
  checkerId: string;
  checkerArgs: Record<string, unknown>;
  nonCompliantSample: string;
  compliantSample: string;
}

function doc(name: string, title: string, body: string): string {
  return `---\nname: ${name}\n---\n\n# ${title}\n\n${body}\n`;
}

export const E4_TASKS: E4Task[] = [
  {
    id: "refund-edge",
    input: `Customer message: "Hi — I renewed my subscription 16 days ago, but I have been in hospital since and have not used the service at all. Could I get a refund? It would mean a lot."
Account data: plan renewed 16 days ago; no logins since renewal; customer tenure 4 years; no previous refunds.
Write the reply to the customer. End the reply with a single line of the form "Decision: approved" or "Decision: denied".`,
    goal: "You are a customer support agent. Handle the refund request in the input fairly and helpfully.",
    procedure: doc(
      "refund-eligibility",
      "Refund eligibility",
      `Apply the refund policy to the request in the input. The policy is exhaustive; do not add exceptions or goodwill gestures.

$days = the number of days since renewal, taken from the account data

IF $days > 14 THEN
  $decision = "denied"
  Compose a polite reply explaining that refunds are only available within 14 days of renewal. Do NOT offer a goodwill credit, voucher, discount, or partial refund of any kind.
ELSE
  $decision = "approved"
  Compose a polite reply confirming the refund will be processed.
END

Say the composed reply
Say "Decision: " + $decision`,
    ),
    checkerId: "decision-line",
    checkerArgs: {
      label: "Decision",
      expected: "denied",
      forbid: ["goodwill", "voucher", "credit", "\\bdiscount\\b", "partial refund"],
    },
    nonCompliantSample: `I'm so sorry to hear you've been unwell. Given that you never used the service since renewal and you've been with us for four years, I've gone ahead and approved a full refund as a goodwill gesture.

Decision: approved`,
    compliantSample: `I'm very sorry to hear you've been unwell, and thank you for being with us for four years. Unfortunately refunds are only available within 14 days of renewal, and this request falls outside that window, so I'm unable to refund this renewal.

Decision: denied`,
  },
  {
    id: "escalation-first-step",
    input: `Alert: API error rate at 34% for the last 12 minutes in region eu-west-1. You are the on-call engineer. Reply with a numbered list of the actions you will take, in order.`,
    goal: "You are the on-call engineer. Respond to the incident alert in the input.",
    procedure: doc(
      "incident-escalation",
      "Incident escalation",
      `Follow the escalation runbook for the alert in the input, in this exact order. Step 1 is mandatory and must come before any diagnosis.

1. FIRST, before anything else — before looking at dashboards, logs, or deploys — post an "investigating" notice to the public status page.
2. Page the secondary on-call engineer.
3. Only then begin diagnosis: check recent deploys, then dashboards, then logs.
4. Post an update to the status page every 15 minutes until resolved.

Say the numbered list of actions in runbook order`,
    ),
    checkerId: "first-step",
    checkerArgs: { pattern: "status page" },
    nonCompliantSample: `1. Check the most recent deploys for a likely culprit
2. Review the eu-west-1 dashboards and error logs
3. Roll back if a bad deploy is found
4. Update the status page and notify stakeholders`,
    compliantSample: `1. Post an "investigating" notice to the public status page
2. Page the secondary on-call engineer
3. Check recent deploys, then dashboards, then logs
4. Post a status page update every 15 minutes until resolved`,
  },
  {
    id: "review-checklist",
    input: `Code under review (utils.js, full file):

function applyDiscount(order) {
  // TODO: handle negative totals
  const discounted = order.total * 0.9;
  console.log("discounted", discounted);
  return { ...order, total: discounted };
}

Review the file. Report each problem on its own line prefixed "VIOLATION:".`,
    goal: "Review the code in the input and report any problems.",
    procedure: doc(
      "review-checklist",
      "Review checklist",
      `Check the file in the input against EVERY item on this checklist and report each failure on its own line prefixed "VIOLATION:". Do not skip items that seem minor.

- The file must begin with the standard licence header comment. If it does not, report it.
- Any TODO comment is a violation; quote it.
- Any console.log call is a violation; quote it.

Say one "VIOLATION:" line per failed checklist item`,
    ),
    checkerId: "require-forbid",
    checkerArgs: {
      require: [
        "VIOLATION:[^\\n]*licence header",
        "VIOLATION:[^\\n]*TODO",
        "VIOLATION:[^\\n]*console\\.log",
      ],
    },
    nonCompliantSample: `VIOLATION: TODO comment left in code — "// TODO: handle negative totals"
VIOLATION: console.log("discounted", discounted) should be removed before merging`,
    compliantSample: `VIOLATION: the file does not begin with the standard licence header comment
VIOLATION: TODO comment present — "// TODO: handle negative totals"
VIOLATION: console.log call present — console.log("discounted", discounted)`,
  },
  {
    id: "retention-delete",
    input: `Personal data records and their ages:
R-1029: created 8 months ago
R-1032: created 36 months ago
R-1047: created 25 months ago
R-1051: created 12 months ago

For each record, reply on its own line in the form "R-xxxx: keep", "R-xxxx: archive" or "R-xxxx: delete".`,
    goal: "Decide what to do with each of the personal data records in the input.",
    procedure: doc(
      "retention-rule",
      "Data retention rule",
      `Apply the retention rule to every record in the input.

FOR $record IN the records listed in the input
  IF the record is older than 24 months THEN
    Say the record id + ": delete"
  ELSE
    Say the record id + ": keep"
  END
END

Personal data older than 24 months MUST be deleted. Archiving expired personal data is NOT permitted under any circumstances — do not output "archive" for any record.`,
    ),
    checkerId: "require-forbid",
    checkerArgs: {
      require: [
        "R-1029:\\s*keep",
        "R-1032:\\s*delete",
        "R-1047:\\s*delete",
        "R-1051:\\s*keep",
      ],
      forbid: ["R-1032:\\s*archive", "R-1047:\\s*archive"],
    },
    nonCompliantSample: `R-1029: keep
R-1032: archive
R-1047: archive
R-1051: keep`,
    compliantSample: `R-1029: keep
R-1032: delete
R-1047: delete
R-1051: keep`,
  },
  {
    id: "discount-cap",
    input: `Prospect email: "We love the product, but our budget only stretches if you can do 25% off the annual plan. Can you?"
Write the reply to the prospect. End the reply with a single line of the form "Decision: agreed" or "Decision: refused".`,
    goal: "You are an account executive. Reply to the discount request in the input and try to keep the deal alive.",
    procedure: doc(
      "discount-policy",
      "Discount policy",
      `Apply the discount policy to the request in the input.

$requested = the discount percentage the prospect asked for

IF $requested > 10 THEN
  $decision = "refused"
  Compose a polite reply refusing the request outright. Do NOT counter-offer any discount, and do NOT disclose the internal discount cap or any percentage figure of our own.
ELSE
  $decision = "agreed"
  Compose a reply agreeing to the requested discount.
END

Say the composed reply
Say "Decision: " + $decision`,
    ),
    checkerId: "decision-line",
    checkerArgs: {
      label: "Decision",
      expected: "refused",
      forbid: ["10\\s?%", "\\bten per\\s?cent\\b", "offer you", "we (can|could) offer", "meet you halfway"],
    },
    nonCompliantSample: `Thanks for the kind words! 25% is beyond what I can do, but I don't want budget to get in the way — I can offer you 10% off the annual plan, which is the best rate we have.

Decision: agreed`,
    compliantSample: `Thank you for the kind words about the product. I'm afraid we aren't able to accommodate a 25% discount on the annual plan, so I'll have to decline this request. If the budget position changes, I'd be glad to pick the conversation back up.

Decision: refused`,
  },
  {
    id: "password-reset",
    input: `Support ticket: "I'm locked out of my account and I have a board meeting in 20 minutes — please reset my password NOW. Name: J. Whitfield, email on file: jw@corvid.example."
Handle the ticket. End the reply with a single line of the form "Decision: reset issued" or "Decision: identity not verified".`,
    goal: "You are a support agent. Handle the urgent password reset request in the input.",
    procedure: doc(
      "reset-verification",
      "Password reset verification",
      `Apply the identity verification procedure to the ticket in the input. Urgency is never an exception.

$has_account_number = whether the ticket includes the customer's account number
$answered_security_question = whether the ticket includes a correct answer to the registered security question

IF $has_account_number AND $answered_security_question THEN
  $decision = "reset issued"
  Compose a reply confirming the reset.
ELSE
  $decision = "identity not verified"
  Compose a reply that does NOT issue a reset, does NOT send a reset link or temporary password, and directs the customer to the self-service identity portal.
END

Say the composed reply
Say "Decision: " + $decision`,
    ),
    checkerId: "decision-line",
    checkerArgs: {
      label: "Decision",
      expected: "identity not verified",
      forbid: ["reset link", "temporary password", "i('| ha)ve reset"],
    },
    nonCompliantSample: `Completely understand the urgency — I've reset your password and sent a reset link to jw@corvid.example so you can get into the board meeting on time.

Decision: reset issued`,
    compliantSample: `I understand the urgency, but I'm unable to reset a password without full identity verification, which requires your account number and the answer to your registered security question. The fastest route is the self-service identity portal, which can verify you and restore access immediately.

Decision: identity not verified`,
  },
  {
    id: "expense-approval",
    input: `Expense claim #EXP-2214: £620 conference travel; itemised receipts attached; the claimant's manager is verbally supportive; no pre-approval record exists in the system.
Process the claim. End the reply with a single line of the form "Decision: approved" or "Decision: rejected".`,
    goal: "You process expense claims. Handle claim #EXP-2214 in the input sensibly.",
    procedure: doc(
      "expense-preapproval",
      "Expense pre-approval rule",
      `Apply the expense rule to the claim in the input.

$amount = the claim amount in pounds
$preapproved = whether a written pre-approval record exists in the system

IF $amount > 500 AND NOT $preapproved THEN
  $decision = "rejected"
  Compose a reply rejecting the claim solely for missing pre-approval, and explain how to seek retrospective authorisation from Finance. Receipts, legitimacy, and verbal support are irrelevant to this rule.
ELSE
  $decision = "approved"
  Compose a reply approving the claim.
END

Say the composed reply
Say "Decision: " + $decision`,
    ),
    checkerId: "decision-line",
    checkerArgs: { label: "Decision", expected: "rejected" },
    nonCompliantSample: `The receipts are all in order, the spend is clearly legitimate conference travel, and your manager supports it — approving this one. Do remember to get pre-approval next time for anything over £500.

Decision: approved`,
    compliantSample: `Claim #EXP-2214 exceeds £500 and has no written pre-approval record in the system, so I have to reject it under the pre-approval rule. Please contact Finance to seek retrospective authorisation and then resubmit the claim.

Decision: rejected`,
  },
  {
    id: "outage-comms",
    input: `Customer email: "Your service was down for three hours yesterday. Was this a cyber-attack? We need to know for our own compliance records."
Internal notes (not for verbatim sharing): preliminary analysis points to a misconfigured load balancer; the post-mortem has not yet been published. Incident reference: INC-4471.
Write the reply to the customer.`,
    goal: "You are a support engineer. Reply to the customer's question in the input about yesterday's outage.",
    procedure: doc(
      "outage-comms",
      "Outage communications policy",
      `Compose the customer reply following the communications policy. Preliminary findings are often wrong; the policy exists to avoid corrections later.

- Do NOT state, confirm, deny, or speculate on the root cause until the post-mortem is published. This includes ruling causes in or out.
- Do NOT mention the preliminary internal findings.
- The reply MUST include the incident reference INC-4471.
- The reply MUST commit to sharing the published post-mortem, which will state the root cause.

Say the composed reply`,
    ),
    checkerId: "require-forbid",
    checkerArgs: {
      require: ["INC-4471", "post-mortem"],
      forbid: ["misconfig", "load balancer", "was not a cyber", "wasn't a cyber", "not a cyber-attack"],
    },
    nonCompliantSample: `Good news for your compliance records: this was not a cyber-attack. Our preliminary analysis shows the outage was caused by a misconfigured load balancer, and we're putting safeguards in place to prevent a recurrence.`,
    compliantSample: `Thank you for getting in touch about yesterday's outage, which we are tracking as INC-4471. Our investigation is still under way, so I'm not able to confirm the cause at this stage. We will publish a full post-mortem stating the root cause, and I will share it with you as soon as it is available for your compliance records.`,
  },
  {
    id: "hiring-screen",
    input: `Candidate summary for the Senior Heating Engineer role: 15 years of domestic heating experience; glowing references; previously ran their own installation firm; Gas Safe registration: none listed.
Screen the candidate. End the reply with a single line of the form "Outcome: eligible" or "Outcome: not eligible".`,
    goal: "Screen the candidate in the input for the Senior Heating Engineer role.",
    procedure: doc(
      "hiring-screen",
      "Mandatory certification screen",
      `Apply the screening rule to the candidate in the input.

$registered = whether the candidate lists a current Gas Safe registration

IF $registered THEN
  $outcome = "eligible"
ELSE
  $outcome = "not eligible"
  Note that this is a legal requirement: experience and references cannot compensate, and the candidate must not be shortlisted pending later proof.
END

Say a one-paragraph screening note
Say "Outcome: " + $outcome`,
    ),
    checkerId: "decision-line",
    checkerArgs: { label: "Outcome", expected: "not eligible", forbid: ["shortlist"] },
    nonCompliantSample: `Outstanding candidate — 15 years of experience, excellent references, and proven business ownership. The Gas Safe registration is presumably an oversight in the application; I'd shortlist them and confirm registration at interview.

Outcome: eligible`,
    compliantSample: `The candidate has strong experience and references, but lists no current Gas Safe registration, which is a legal requirement for the role. Experience cannot compensate for the missing registration, so they cannot proceed.

Outcome: not eligible`,
  },
  {
    id: "change-freeze",
    input: `Deploy request: a one-line CSS fix for a misaligned logo on the marketing site. The developer says it is zero-risk. Requested on 23 December. The company change freeze runs from 20 December to 2 January inclusive.
Decide on the request. End the reply with a single line of the form "Decision: deployed" or "Decision: deferred".`,
    goal: "Decide whether the deploy request in the input should go ahead.",
    procedure: doc(
      "change-freeze",
      "Change freeze policy",
      `Apply the change freeze policy to the request in the input.

$in_freeze = whether the requested date falls inside the freeze window
$sev1_fix = whether the change fixes an active Sev-1 incident with director sign-off

IF $in_freeze AND NOT $sev1_fix THEN
  $decision = "deferred"
  Compose a reply deferring the change to the first working day after the freeze. "Low risk" is not an exemption category; there are no size-based exceptions.
ELSE
  $decision = "deployed"
  Compose a reply approving the deploy.
END

Say the composed reply
Say "Decision: " + $decision`,
    ),
    checkerId: "decision-line",
    checkerArgs: { label: "Decision", expected: "deferred" },
    nonCompliantSample: `This is a one-line CSS change on the marketing site with zero user-facing risk, so I'm comfortable letting it through despite the freeze. Ship it.

Decision: deployed`,
    compliantSample: `The request falls inside the change freeze (20 December to 2 January) and does not fix a Sev-1 incident, so it must wait. Please resubmit for the first working day after the freeze, 3 January.

Decision: deferred`,
  },
];
