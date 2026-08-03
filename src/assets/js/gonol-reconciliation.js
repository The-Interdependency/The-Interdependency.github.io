// === MODULE_BUILD ===
// id: public_gonol_receipt_reconciliation
//   purpose: Reconcile the published Gonol lab with the merged strict UCNS receipt schema and intercept stale downloads.
//   entrypoint: dynamically imported by site.js only on the Gonol relationship lab
//   tests: tests/post-merge-reconciliation.test.mjs, tests/gonol-relationships.test.mjs
// === END MODULE_BUILD ===

const lab = document.querySelector('[data-gonol-lab]');
if (!lab) throw new Error('Gonol reconciliation loaded without a relationship lab.');

const receiptOutput = lab.querySelector('[data-receipt-output]');
const vectorOutput = lab.querySelector('[data-vector-output]');
const downloadButton = lab.querySelector('[data-download-receipt]');
const statusOutput = lab.querySelector('[data-gonol-status]');
const comparisonControl = lab.querySelector('[data-comparison-policy]');
const derivedLayersControl = lab.querySelector('[data-derived-layers]');
const publication = JSON.parse(document.querySelector('#gonol-relationship-publication').textContent);

const REQUIRED_LOSSES = [
  'native-scale magnitude is not encoded by visible radius',
  'continuous Mobius band width and local-frame motion are not encoded by the centerline projection'
];
const REQUIRED_HMMM = [
  'continuous local-frame geometry across the Mobius band',
  'seven-gonol display geometry and pairing plan',
  'promotion law for derived scope or relationship circles',
  'cross-scope and higher-gonol composition',
  'English root policy, lexical source completion, and hyperdimensional embedding law'
];
const NON_TRANSFER = {
  authority_transfer: false,
  semantic_authority_transfer: false,
  proof_status_transfer: false,
  certification_status_transfer: false,
  measurement_status_transfer: false,
  empirical_status_transfer: false,
  completion_status_transfer: false,
  embedding_status_transfer: false,
  producer_authentication_transfer: false
};
const PAIR_PLAN = {
  1: { plan_id: 'ucns.pairing.none-one', pairs: [] },
  2: { plan_id: 'ucns.pairing.vesica-two', pairs: [['A', 'B']] },
  3: { plan_id: 'ucns.pairing.triquetra-three', pairs: [['A', 'B'], ['B', 'C'], ['C', 'A']] },
  7: { plan_id: 'ucns.pairing.full-seven-unresolved', pairs: [] }
};

let inputRevision = 0;
let reconciledRevision = -1;
let reconciling = false;

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function activeArity() {
  return Number(lab.querySelector('input[name="gonol-arity"]:checked')?.value || 2);
}

function normalizeOperand(operand, index) {
  const slot = String.fromCharCode(65 + index);
  const hmmm = Array.from(new Set([
    ...(operand.hmmm || []),
    'browser textarea values normalize CRLF and CR line endings to LF before UTF-8 hashing'
  ]));
  return {
    operand_slot: slot,
    operand_id: `${slot}:${operand.gonol_id || operand.operand_id || 'hmmm-unset'}`,
    gonol_id: operand.gonol_id || `hmmm-unset-gonol-${slot}`,
    occurrence_ordinal: Number.isInteger(operand.occurrence_ordinal) ? operand.occurrence_ordinal : index,
    source_identity: operand.source_identity || `hmmm-unset-source-${slot}`,
    content_adapter: {
      name: 'website.browser-textarea-lf-utf8',
      version: '0.2.0'
    },
    content_digest: operand.content_digest || null,
    native_scale: {
      scale_id: operand.native_scale?.scale_id || `hmmm-unset-scale-${slot}`,
      declaration: operand.native_scale?.declaration || operand.native_scale?.scale_id || `hmmm-unset-scale-${slot}`,
      numeric_rank: null
    },
    payload_reference: operand.payload_reference || `interactive-session:hmmm-unresolved:${slot}`,
    retained_structure_reference: operand.retained_structure_reference ?? null,
    trajectory_reference: operand.trajectory_reference ?? null,
    evidence_status: 'represented-evidence',
    hmmm
  };
}

function normalizePair(pair, index, plan) {
  const [left, right] = plan.pairs[index];
  const measured = pair.relationship_status === 'candidate-measured-evidence';
  const policy = measured ? {
    policy_id: 'website.comparison.browser-textarea-lf-utf8',
    policy_version: '0.2.0',
    standing: 'experiment-candidate',
    parameters: {
      adapter: 'website.browser-textarea-lf-utf8/0.2.0',
      normalization: 'html-textarea-value-crlf-and-cr-to-lf'
    },
    information_loss: [
      'original CRLF or CR line-ending bytes are not recoverable from an HTML textarea value',
      'comparison does not establish structural, semantic, geometric, native-scale, or completion equivalence'
    ]
  } : null;
  return {
    pair_id: `${left}-${right}`,
    left_operand_slot: left,
    right_operand_slot: right,
    relationship_status: measured ? 'candidate-measured-evidence' : 'represented-evidence',
    comparison_policy: policy,
    comparison_outcome: measured ? pair.comparison_outcome : null,
    evidence: pair.evidence?.length ? pair.evidence : [`${left}↔${right} remains a distinct relationship occurrence`],
    information_loss: pair.information_loss?.length ? pair.information_loss : REQUIRED_LOSSES,
    hmmm: pair.hmmm?.length ? pair.hmmm : ['pairwise display evidence does not select a comparison or completion law']
  };
}

async function reconcileReceipt(raw) {
  const arity = Number(raw.primitive_arity || activeArity());
  const plan = PAIR_PLAN[arity];
  if (!plan) throw new Error(`Unsupported primitive arity ${arity}.`);
  const operands = (raw.operands || []).slice(0, arity).map(normalizeOperand);
  const pairwise = (raw.pairwise_receipts || []).slice(0, plan.pairs.length)
    .map((pair, index) => normalizePair(pair, index, plan));
  const candidateMeasured = pairwise.some(pair => pair.relationship_status === 'candidate-measured-evidence');
  const receipt = {
    schema_id: 'ucns.gonol-relationship-receipt',
    schema_version: '0.1.0',
    receipt_id: 'pending',
    primitive_arity: arity,
    operands,
    display_policy: {
      policy_id: 'ucns.display.relation-equalized',
      policy_version: '0.1.0',
      standing: 'declared-static-projection',
      parameters: {
        display_radius: 1,
        native_scale_retained: true,
        visible_radius_represents_native_scale: false,
        derived_layers_visible: Boolean(derivedLayersControl?.checked)
      },
      information_loss: REQUIRED_LOSSES
    },
    pairing_plan: {
      plan_id: plan.plan_id,
      plan_version: '0.1.0',
      pairs: plan.pairs,
      standing: arity === 7 ? 'hmmm-unresolved' : 'declared-static-projection'
    },
    pairwise_receipts: pairwise,
    joint_context: arity === 3 ? {
      standing: 'represented-evidence',
      evidence: ['central three-way overlap remains joint context beside all three pairwise vesicas'],
      promoted_to_gonol: false
    } : null,
    evidence_status: candidateMeasured ? 'candidate-measured-evidence' : 'represented-evidence',
    candidate_identity: candidateMeasured ? {
      name: 'website.browser-textarea-lf-utf8-equality',
      evaluator_kind: 'browser-local-exact-digest-comparison',
      version: '0.2.0',
      code_reference: 'The-Interdependency/The-Interdependency.github.io:src/assets/js/gonol-reconciliation.js',
      scope: 'active entered operands in one local browser relationship receipt',
      policy_dependencies: ['website.comparison.browser-textarea-lf-utf8/0.2.0']
    } : null,
    provenance: {
      contract_repository: publication.source.repository,
      contract_commit: publication.source.commit,
      contract_path: publication.source.path,
      contract_blob: publication.source.blob,
      contract_sha256: publication.source.sha256,
      producer_authenticated: false,
      consumer_reference: 'The-Interdependency/The-Interdependency.github.io:/artifacts/gonol-relationships/'
    },
    non_transfer: NON_TRANSFER,
    information_loss: REQUIRED_LOSSES,
    hmmm: REQUIRED_HMMM
  };
  const identity = { ...receipt };
  delete identity.receipt_id;
  receipt.receipt_id = `website-gonol-relation:sha256:${await sha256(canonical(identity))}`;
  return receipt;
}

function reconcileVector() {
  try {
    const vector = JSON.parse(vectorOutput.textContent);
    if (!Array.isArray(vector.occurrences)) return;
    vector.occurrences = vector.occurrences.map(occurrence => ({
      source_ordinal: occurrence.source_ordinal,
      unicode_scalar_value: occurrence.source_value?.codePointAt(0) ?? null,
      carrier_position_or_null: occurrence.carrier_position ?? null,
      source_value: occurrence.source_value,
      role: occurrence.role,
      instantiates_vertex: occurrence.instantiates_vertex,
      carrier_assignment: occurrence.carrier_assignment
    }));
    vectorOutput.textContent = JSON.stringify(vector, null, 2);
  } catch {
    // The producer module may still be assembling its first vector.
  }
}

function updatePairOutputs(receipt) {
  const byId = new Map(receipt.pairwise_receipts.map(pair => [pair.pair_id.replace('-', ''), pair]));
  lab.querySelectorAll('[data-pair-receipt]').forEach(element => {
    const pair = element.closest('[data-pair]')?.dataset.pair;
    element.textContent = byId.has(pair)
      ? JSON.stringify(byId.get(pair), null, 2)
      : 'No pairwise receipt belongs to the selected primitive.';
  });
}

async function reconcileVisibleReceipt() {
  if (reconciling) return;
  let raw;
  try {
    raw = JSON.parse(receiptOutput.textContent);
  } catch {
    return;
  }
  if (raw.non_transfer && raw.provenance?.contract_blob && raw.receipt_id?.includes('sha256:')) {
    reconciledRevision = inputRevision;
    return;
  }
  reconciling = true;
  try {
    const receipt = await reconcileReceipt(raw);
    receiptOutput.textContent = JSON.stringify(receipt, null, 2);
    updatePairOutputs(receipt);
    reconcileVector();
    reconciledRevision = inputRevision;
    lab.dataset.strictReceiptReady = 'true';
  } finally {
    reconciling = false;
  }
}

function downloadStrictReceipt(receiptText) {
  const href = URL.createObjectURL(new Blob([receiptText], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = href;
  link.download = `gonol-relationship-${activeArity()}-strict-receipt.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

async function waitForCurrentReceipt() {
  const deadline = performance.now() + 2000;
  while (performance.now() < deadline) {
    await reconcileVisibleReceipt();
    if (reconciledRevision === inputRevision && lab.dataset.strictReceiptReady === 'true') return receiptOutput.textContent;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error('The current strict receipt did not settle before download.');
}

lab.addEventListener('input', () => {
  inputRevision += 1;
  lab.dataset.strictReceiptReady = 'false';
}, { capture: true });
lab.addEventListener('change', () => {
  inputRevision += 1;
  lab.dataset.strictReceiptReady = 'false';
}, { capture: true });

new MutationObserver(() => {
  queueMicrotask(() => {
    reconcileVisibleReceipt();
    reconcileVector();
  });
}).observe(receiptOutput, { childList: true, characterData: true, subtree: true });

if (comparisonControl) {
  const exactOption = comparisonControl.querySelector('option[value="exact-utf8"]');
  if (exactOption) exactOption.textContent = 'Browser-normalized LF UTF-8 bytes — experiment candidate';
}
const operandIntro = lab.querySelector('#operands-heading + .section-intro');
if (operandIntro) {
  operandIntro.textContent = 'Enter source text or a serialized gonol. Unicode scalar values and case are preserved. HTML textarea values normalize CRLF and CR line endings to LF before hashing; every portable receipt declares that loss.';
}

downloadButton.addEventListener('click', async event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  statusOutput.textContent = 'Finalizing the current strict receipt…';
  try {
    const text = await waitForCurrentReceipt();
    downloadStrictReceipt(text);
    statusOutput.textContent = 'Current strict relationship receipt downloaded.';
  } catch {
    statusOutput.textContent = 'Receipt download stopped because the current strict state could not be finalized.';
  }
}, { capture: true });

reconcileVisibleReceipt();
reconcileVector();
