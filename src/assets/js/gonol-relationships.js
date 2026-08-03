// === MODULE_BUILD ===
// id: public_gonol_relationship_lab
//   module_name: gonol-relationships
//   module_kind: interaction
//   summary: assemble exact Public Gonol occurrence-address evidence and render commit-pinned one-, two-, three-, and seven-gonol relationship receipts
//   owner: Erin Spencer
//   public_surface: browser artifact at /artifacts/gonol-relationships/
//   internal_surface: exact UTF-8 digest, occurrence vectorizer, SVG projections, relationship receipt assembler
//   auth_boundary: none
//   storage_boundary: generated receipts remain in browser memory until the user explicitly downloads one
//   network_boundary: none; contract and schema are static commit-pinned assets
//   user_data_boundary: entered text remains local to the page and is never normalized, uploaded, or persisted by this module
//   admin_only: false
//   tests: tests/gonol-relationships.test.mjs, tests/site.spec.mjs, tests/accessibility.spec.mjs
//   rollout: dependent draft consumer of UCNS gonol relationship-display contract 0.1.0
//   rollback: remove this module with the artifact page and pinned source data
//   since: 2026-08-03
//   unresolved: continuous Mobius frame, seven-form geometry, higher-gonol composition, English lexical floor, root policy, and hyperdimensional embedding
// === END MODULE_BUILD ===

// === CONTRACTS ===
// id: public_gonol_occurrences_remain_exact
//   given: source text enters an operand field
//   then: Unicode scalar occurrences, order, multiplicity, SPACE boundaries, unassigned scalars, and invalid surrogate evidence remain explicit without normalization
//   class: evidence
//   since: 2026-08-03
//
// id: gonol_relationship_primitives_preserve_options
//   given: the user selects primitive arity one, two, three, or seven
//   then: one uses a figure-eight projection, two retains the complete vesica and derived circles, three retains AB/BC/CA vesicas, and seven displays no guessed geometry
//   class: doctrine
//   since: 2026-08-03
//
// id: gonol_comparison_requires_explicit_policy
//   given: operands at any declared native scales enter a relationship
//   then: representation is always available while a comparison outcome exists only under the selected named candidate policy and visible-radius equalization remains declared loss
//   class: safety
//   since: 2026-08-03
//
// id: gonol_receipt_retains_producer_boundary
//   given: an interactive relationship receipt is emitted
//   then: exact UCNS commit, path, blob, contract digest, native scales, policy standing, losses, and hmmm fields remain present without authority transfer
//   class: evidence
//   since: 2026-08-03
// === END CONTRACTS ===

const lab = document.querySelector('[data-gonol-lab]');

if (lab) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SLOTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const PAIRS = {
    1: [],
    2: [['A', 'B']],
    3: [['A', 'B'], ['B', 'C'], ['C', 'A']],
    7: []
  };

  const contract = JSON.parse(document.querySelector('#gonol-relationship-contract').textContent);
  const publication = JSON.parse(document.querySelector('#gonol-relationship-publication').textContent);
  const tokenPosition = new Map(contract.public_gonol.tokens.map((token, position) => [token, position]));
  const spaceCodePoints = new Set(contract.public_gonol.space_manifestation_code_points);

  const stage = lab.querySelector('[data-gonol-stage]');
  const stageHeading = lab.querySelector('#relationship-display-heading');
  const stageDescription = lab.querySelector('[data-stage-description]');
  const stageStanding = lab.querySelector('[data-stage-standing]');
  const stageLegend = lab.querySelector('.gonol-stage-legend');
  const comparisonControl = lab.querySelector('[data-comparison-policy]');
  const derivedLayersControl = lab.querySelector('[data-derived-layers]');
  const publicOperandControl = lab.querySelector('[data-public-operand]');
  const vectorOutput = lab.querySelector('[data-vector-output]');
  const receiptOutput = lab.querySelector('[data-receipt-output]');
  const statusOutput = lab.querySelector('[data-gonol-status]');
  const downloadButton = lab.querySelector('[data-download-receipt]');
  const gridItems = Array.from(lab.querySelectorAll('[data-carrier-position]'));
  const operandViews = new Map(SLOTS.map(slot => {
    const root = lab.querySelector(`[data-operand="${slot}"]`);
    return [slot, {
      root,
      name: root.querySelector('[data-operand-name]'),
      scale: root.querySelector('[data-operand-scale]'),
      source: root.querySelector('[data-operand-source]'),
      payload: root.querySelector('[data-operand-payload]'),
      snapshot: root.querySelector('[data-operand-snapshot]')
    }];
  }));

  let currentReceiptText = '';
  let updateSequence = 0;
  let updateTimer = 0;

  function svgElement(name, attributes = {}, text = null) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    if (text !== null) element.textContent = text;
    return element;
  }

  function activeArity() {
    return Number(lab.querySelector('input[name="gonol-arity"]:checked')?.value || 2);
  }

  function codePointLabel(value) {
    return `U+${value.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
  }

  function containsUnpairedSurrogate(value) {
    for (let index = 0; index < value.length; index += 1) {
      const unit = value.charCodeAt(index);
      if (unit >= 0xD800 && unit <= 0xDBFF) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 0xDC00 && next <= 0xDFFF)) return true;
        index += 1;
      } else if (unit >= 0xDC00 && unit <= 0xDFFF) {
        return true;
      }
    }
    return false;
  }

  async function sha256Utf8(value) {
    if (containsUnpairedSurrogate(value) || !globalThis.crypto?.subtle) return null;
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function vectorize(value) {
    return Array.from(value).map((sourceValue, sourceOrdinal) => {
      const scalar = sourceValue.codePointAt(0);
      const invalidSurrogate = scalar >= 0xD800 && scalar <= 0xDFFF;
      const codePoint = codePointLabel(sourceValue);
      const isSpace = !invalidSurrogate && spaceCodePoints.has(codePoint);
      const assignedPosition = isSpace ? 0 : tokenPosition.get(sourceValue);
      return {
        source_ordinal: sourceOrdinal,
        code_point: codePoint,
        source_value: sourceValue,
        carrier_position: invalidSurrogate ? null : (assignedPosition ?? null),
        role: invalidSurrogate ? 'rejected-surrogate' : (isSpace ? 'space-boundary' : 'possessed-character-occurrence'),
        instantiates_vertex: !invalidSurrogate && !isSpace,
        carrier_assignment: invalidSurrogate ? 'rejected' : (assignedPosition === undefined && !isSpace ? 'unassigned-retained' : 'assigned')
      };
    });
  }

  async function assembleOperand(slot, occurrenceOrdinal) {
    const view = operandViews.get(slot);
    const payload = view.payload.value;
    const vectors = vectorize(payload);
    const invalidSurrogate = containsUnpairedSurrogate(payload);
    const digest = await sha256Utf8(payload);
    const gonolId = view.name.value || `hmmm-unset-gonol-${slot}`;
    const scaleId = view.scale.value || `hmmm-unset-scale-${slot}`;
    const sourceIdentity = view.source.value || `hmmm-unset-source-${slot}`;
    const hmmm = [
      'complete retained-structure and trajectory references were not supplied by this interactive adapter',
      'occurrence-address vectors are identity evidence, not geometric embedding coordinates'
    ];
    if (invalidSurrogate) hmmm.push('payload contains an unpaired surrogate; strict Unicode-scalar admission and exact UTF-8 digest fail closed');
    if (!globalThis.crypto?.subtle) hmmm.push('Web Crypto SHA-256 is unavailable; content digest remains unresolved');

    const snapshot = {
      operand_id: `operand-${slot}`,
      gonol_id: gonolId,
      source_identity: sourceIdentity,
      native_scale: scaleId,
      exact_payload: payload,
      content_digest_sha256: digest,
      occurrence_count: vectors.length,
      vertex_occurrence_count: vectors.filter(vector => vector.instantiates_vertex).length,
      space_boundary_count: vectors.filter(vector => vector.role === 'space-boundary').length,
      carrier_unassigned_count: vectors.filter(vector => vector.carrier_assignment === 'unassigned-retained').length,
      invalid_surrogate_count: vectors.filter(vector => vector.role === 'rejected-surrogate').length,
      hmmm
    };
    view.snapshot.textContent = JSON.stringify(snapshot, null, 2);

    return {
      slot,
      payload,
      vectors,
      snapshot,
      receiptOperand: {
        operand_id: `operand-${slot}`,
        gonol_id: gonolId,
        occurrence_ordinal: occurrenceOrdinal,
        source_identity: sourceIdentity,
        content_adapter: { name: 'website.exact-utf8-text', version: '0.1.0' },
        content_digest: digest,
        native_scale: { scale_id: scaleId, declaration: scaleId, numeric_rank: null },
        payload_reference: digest ? `interactive-session:sha256:${digest}` : `interactive-session:hmmm-unresolved:${slot}`,
        retained_structure_reference: null,
        trajectory_reference: null,
        evidence_status: 'represented-evidence',
        hmmm
      }
    };
  }

  function resetStage(title, description) {
    const titleElement = svgElement('title', { id: 'gonol-stage-title' }, title);
    const descriptionElement = svgElement('desc', { id: 'gonol-stage-desc' }, description);
    const drawing = svgElement('g', { 'aria-hidden': 'true' });
    stage.replaceChildren(titleElement, descriptionElement, drawing);
    return drawing;
  }

  function addLabel(group, x, y, operand) {
    group.append(
      svgElement('text', { class: 'gonol-svg-label', x, y }, operand.slot),
      svgElement('text', { class: 'gonol-svg-scale', x, y: y + 20 }, operand.receiptOperand.native_scale.scale_id)
    );
  }

  function circleIntersections(left, right, radius) {
    const dx = right.x - left.x;
    const dy = right.y - left.y;
    const distance = Math.hypot(dx, dy);
    const midpoint = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    const height = Math.sqrt(Math.max(0, radius * radius - (distance * distance) / 4));
    const perpendicular = { x: -dy / distance, y: dx / distance };
    return [
      { x: midpoint.x + perpendicular.x * height, y: midpoint.y + perpendicular.y * height },
      { x: midpoint.x - perpendicular.x * height, y: midpoint.y - perpendicular.y * height }
    ];
  }

  function addLens(defs, group, left, right, radius, pairId) {
    const clipId = `gonol-clip-${pairId.toLowerCase()}`;
    const clip = svgElement('clipPath', { id: clipId });
    clip.append(svgElement('circle', { cx: right.x, cy: right.y, r: radius }));
    defs.append(clip);
    group.append(svgElement('circle', {
      class: `gonol-lens gonol-lens-${pairId.toLowerCase()}`,
      cx: left.x,
      cy: left.y,
      r: radius,
      'clip-path': `url(#${clipId})`,
      'data-pair': pairId
    }));
  }

  function addDerivedPairLayers(group, left, right, radius, pairId) {
    if (!derivedLayersControl.checked) return;
    const midpoint = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    group.append(
      svgElement('circle', { class: 'gonol-scope-ring', cx: midpoint.x, cy: midpoint.y, r: radius * 1.5, 'data-pair': pairId }),
      svgElement('circle', { class: 'gonol-relationship-ring', cx: midpoint.x, cy: midpoint.y, r: radius * 0.5, 'data-pair': pairId })
    );
  }

  function addPairIntersections(group, left, right, radius, pairId) {
    for (const point of circleIntersections(left, right, radius)) {
      group.append(svgElement('circle', {
        class: 'gonol-intersection',
        cx: point.x,
        cy: point.y,
        r: 5,
        'data-pair-intersection': pairId
      }));
    }
  }

  function renderSingle(operand) {
    const description = `One continuous figure-eight projection for ${operand.receiptOperand.gonol_id}. The projected crossing is not a vertex, seam, second gonol, or Structural Null.`;
    const drawing = resetStage('Single Möbius gonol as a figure-eight projection', description);
    const pathPoints = [];
    for (let index = 0; index <= 240; index += 1) {
      const t = (Math.PI * 2 * index) / 240;
      const x = 320 + 210 * Math.sin(t);
      const y = 210 - 178 * Math.sin(t) * Math.cos(t);
      pathPoints.push(`${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
    }
    drawing.append(svgElement('path', { class: 'gonol-figure-eight', d: pathPoints.join(' ') }));

    const counts = new Map();
    for (const vector of operand.vectors) {
      if (vector.instantiates_vertex && vector.carrier_position !== null) counts.set(vector.carrier_position, (counts.get(vector.carrier_position) || 0) + 1);
    }
    contract.public_gonol.tokens.forEach((token, position) => {
      const t = (Math.PI * 2 * position) / contract.public_gonol.arity;
      const x = 320 + 210 * Math.sin(t);
      const y = 210 - 178 * Math.sin(t) * Math.cos(t);
      const count = counts.get(position) || 0;
      drawing.append(svgElement('circle', {
        class: count ? 'gonol-address gonol-address-active' : 'gonol-address',
        cx: x,
        cy: y,
        r: count ? Math.min(8, 4 + count) : 2,
        'data-address-position': position
      }));
    });
    drawing.append(
      svgElement('circle', { class: 'gonol-projection-crossing', cx: 320, cy: 210, r: 12 }),
      svgElement('text', { class: 'gonol-crossing-label', x: 320, y: 235 }, 'projection crossing · no vertex')
    );
    stageHeading.textContent = 'Single Möbius gonol';
    stageDescription.textContent = description;
    stageStanding.textContent = 'figure-eight projection';
    stageStanding.className = 'status status-interpretation';
    stageLegend.hidden = true;
  }

  function renderVesica(operands) {
    const radius = 120;
    const centers = { A: { x: 250, y: 210 }, B: { x: 370, y: 210 } };
    const description = 'Two equalized centerlines are one radius apart. Both complete circles, the two visible intersection occurrences, their vesica, the outer scope circle, and the inner relationship circle remain recoverable.';
    const drawing = resetStage('Vesica Möbius relationship', description);
    const defs = svgElement('defs');
    stage.insertBefore(defs, drawing);
    addLens(defs, drawing, centers.A, centers.B, radius, 'AB');
    addDerivedPairLayers(drawing, centers.A, centers.B, radius, 'AB');
    drawing.append(
      svgElement('circle', { class: 'gonol-operand-ring gonol-ring-a', cx: centers.A.x, cy: centers.A.y, r: radius }),
      svgElement('circle', { class: 'gonol-operand-ring gonol-ring-b', cx: centers.B.x, cy: centers.B.y, r: radius })
    );
    addPairIntersections(drawing, centers.A, centers.B, radius, 'AB');
    addLabel(drawing, 205, 208, operands[0]);
    addLabel(drawing, 435, 208, operands[1]);
    stageHeading.textContent = 'Vesica Möbius';
    stageDescription.textContent = description;
    stageStanding.textContent = 'declared static projection';
    stageStanding.className = 'status status-interpretation';
    stageLegend.hidden = false;
  }

  function renderTriquetra(operands) {
    const radius = 120;
    const centers = {
      A: { x: 250, y: 260 },
      B: { x: 370, y: 260 },
      C: { x: 310, y: 156.07695154586736 }
    };
    const description = 'Three equalized centerlines form an equilateral construction. AB, BC, and CA remain three complete vesicas with separate receipt and intersection identities; the central overlap is joint context, not a fourth gonol.';
    const drawing = resetStage('Triquetra with three retained vesicas', description);
    const defs = svgElement('defs');
    stage.insertBefore(defs, drawing);
    for (const [leftSlot, rightSlot] of PAIRS[3]) {
      const pairId = `${leftSlot}${rightSlot}`;
      addLens(defs, drawing, centers[leftSlot], centers[rightSlot], radius, pairId);
      addDerivedPairLayers(drawing, centers[leftSlot], centers[rightSlot], radius, pairId);
    }
    for (const slot of ['A', 'B', 'C']) {
      drawing.append(svgElement('circle', { class: `gonol-operand-ring gonol-ring-${slot.toLowerCase()}`, cx: centers[slot].x, cy: centers[slot].y, r: radius }));
    }
    for (const [leftSlot, rightSlot] of PAIRS[3]) addPairIntersections(drawing, centers[leftSlot], centers[rightSlot], radius, `${leftSlot}${rightSlot}`);
    addLabel(drawing, 205, 284, operands[0]);
    addLabel(drawing, 435, 284, operands[1]);
    addLabel(drawing, 310, 105, operands[2]);
    stageHeading.textContent = 'Triquetra with retained vesicas';
    stageDescription.textContent = description;
    stageStanding.textContent = 'three pairwise receipts';
    stageStanding.className = 'status status-interpretation';
    stageLegend.hidden = false;
  }

  function renderSeven(operands) {
    const description = 'Seven operand identities are retained. UCNS has not supplied a seven-gonol placement or pairing plan, so this view draws no circles, edges, overlaps, center, heptagon, rosette, or flower-of-life substitute.';
    const drawing = resetStage('Seven-gonol identity rack; geometry unresolved', description);
    operands.forEach((operand, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = column ? 340 : 70;
      const y = 56 + row * 78;
      drawing.append(
        svgElement('rect', { class: 'gonol-identity-box', x, y, width: 230, height: 56, rx: 12 }),
        svgElement('text', { class: 'gonol-identity-label', x: x + 14, y: y + 24 }, `${operand.slot} · ${operand.receiptOperand.gonol_id}`),
        svgElement('text', { class: 'gonol-svg-scale', x: x + 14, y: y + 43 }, operand.receiptOperand.native_scale.scale_id)
      );
    });
    drawing.append(svgElement('text', { class: 'gonol-seven-hmmm', x: 320, y: 390 }, 'hmmm — seven-form geometry and pairing plan unresolved'));
    stageHeading.textContent = 'Seven-gonol primitive';
    stageDescription.textContent = description;
    stageStanding.textContent = 'hmmm unresolved';
    stageStanding.className = 'status status-hmmm';
    stageLegend.hidden = true;
  }

  function renderStage(arity, operands) {
    if (arity === 1) renderSingle(operands[0]);
    else if (arity === 2) renderVesica(operands);
    else if (arity === 3) renderTriquetra(operands);
    else renderSeven(operands);
  }

  function updateVisibility(arity) {
    SLOTS.forEach((slot, index) => {
      operandViews.get(slot).root.hidden = index >= arity;
      const option = publicOperandControl.querySelector(`option[value="${slot}"]`);
      option.hidden = index >= arity;
    });
    if (SLOTS.indexOf(publicOperandControl.value) >= arity) publicOperandControl.value = 'A';
    for (const pairElement of lab.querySelectorAll('.gonol-pair[data-pair]')) {
      const pairId = pairElement.dataset.pair;
      pairElement.hidden = !PAIRS[arity].some(pair => pair.join('') === pairId);
    }
  }

  function updatePublicGonol(selectedOperand) {
    const counts = new Map();
    for (const vector of selectedOperand.vectors) {
      if (vector.instantiates_vertex && vector.carrier_position !== null) counts.set(vector.carrier_position, (counts.get(vector.carrier_position) || 0) + 1);
    }
    for (const item of gridItems) {
      const position = Number(item.dataset.carrierPosition);
      const count = counts.get(position) || 0;
      item.classList.toggle('is-possessed', count > 0);
      item.classList.toggle('is-origin', position === contract.public_gonol.origin_position);
      const countLabel = item.querySelector('[data-position-count]');
      countLabel.hidden = count === 0;
      countLabel.textContent = count > 1 ? `×${count}` : '●';
      countLabel.setAttribute('aria-label', count ? `${count} possessed occurrence${count === 1 ? '' : 's'}` : '');
    }
    vectorOutput.textContent = JSON.stringify({
      operand_id: selectedOperand.receiptOperand.operand_id,
      native_scale: selectedOperand.receiptOperand.native_scale,
      vector_policy: {
        id: 'ucns.public-gonol-occurrence-address',
        version: '0.1.0',
        standing: contract.public_gonol.vector_standing,
        dimensions: contract.public_gonol.occurrence_address_vector
      },
      occurrences: selectedOperand.vectors
    }, null, 2);
  }

  function comparisonPolicy() {
    if (comparisonControl.value === 'none') return null;
    return {
      policy_id: 'website.comparison.exact-utf8-bytes',
      policy_version: '0.1.0',
      standing: 'experiment-candidate',
      parameters: { adapter: 'website.exact-utf8-text/0.1.0', normalization: 'none-preserve-source' },
      information_loss: [
        'compares exact serialized UTF-8 bytes only',
        'does not establish canonical structural, semantic, geometric, native-scale, or completion equivalence'
      ]
    };
  }

  function pairwiseReceipt(left, right) {
    const policy = comparisonPolicy();
    const comparisonAvailable = Boolean(policy && left.receiptOperand.content_digest && right.receiptOperand.content_digest);
    const pairId = `${left.slot}${right.slot}`;
    return {
      pair_id: `vesica-${pairId.toLowerCase()}`,
      left_operand_id: left.receiptOperand.operand_id,
      right_operand_id: right.receiptOperand.operand_id,
      relationship_status: comparisonAvailable ? 'candidate-measured-evidence' : 'represented-evidence',
      comparison_policy: policy,
      comparison_outcome: !policy ? null : (comparisonAvailable ? {
        status: 'candidate-output',
        exact_utf8_equal: left.receiptOperand.content_digest === right.receiptOperand.content_digest,
        native_scale_label_equal: left.receiptOperand.native_scale.scale_id === right.receiptOperand.native_scale.scale_id,
        left_sha256: left.receiptOperand.content_digest,
        right_sha256: right.receiptOperand.content_digest
      } : {
        status: 'hmmm-unavailable',
        reason: 'strict Unicode-scalar admission or Web Crypto digest is unavailable for at least one operand'
      }),
      evidence: [
        `vesica ${left.slot}↔${right.slot} remains a distinct pairwise relationship occurrence`,
        'equalized display circles have radius 1 and center distance 1',
        'both full operand centerlines, the lens, two intersection occurrences, scope circle, and relationship circle remain recoverable'
      ],
      information_loss: contract.scale_contract.information_loss,
      hmmm: [
        'visible overlap is a relationship projection, not a source-derived distance or completion claim',
        'native-scale labels have no supplied cross-scale numerical law'
      ]
    };
  }

  function assembleReceipt(arity, operands) {
    const pairs = PAIRS[arity];
    const bySlot = new Map(operands.map(operand => [operand.slot, operand]));
    const pairwiseReceipts = pairs.map(([left, right]) => pairwiseReceipt(bySlot.get(left), bySlot.get(right)));
    const candidateMeasured = pairwiseReceipts.some(receipt => receipt.relationship_status === 'candidate-measured-evidence');
    const digestIdentity = operands.map(operand => operand.receiptOperand.content_digest?.slice(0, 12) || 'hmmm').join('-');
    const primitive = contract.primitives.find(candidate => candidate.arity === arity);
    return {
      schema_id: 'ucns.gonol-relationship-receipt',
      schema_version: '0.1.0',
      receipt_id: `website-gonol-relation:${arity}:${digestIdentity}`,
      primitive_arity: arity,
      operands: operands.map(operand => operand.receiptOperand),
      display_policy: {
        policy_id: contract.scale_contract.display_policy_id,
        policy_version: contract.scale_contract.display_policy_version,
        standing: arity === 7 ? 'unresolved' : 'declared-static-projection',
        parameters: { display_radius: contract.scale_contract.display_radius, projection_id: primitive.projection_id },
        information_loss: contract.scale_contract.information_loss
      },
      pairing_plan: {
        plan_id: arity === 7 ? 'ucns.pairing.hmmm-unresolved' : `ucns.pairing.primitive-${arity}`,
        plan_version: '0.1.0',
        pairs: pairs.map(pair => pair.map(slot => `operand-${slot}`)),
        standing: arity === 7 ? 'hmmm-unresolved' : 'declared-static-projection'
      },
      pairwise_receipts: pairwiseReceipts,
      joint_context: arity === 3 ? {
        standing: 'represented-evidence',
        evidence: ['central three-way overlap retained as joint context beside all three pairwise vesicas'],
        promoted_to_gonol: false
      } : null,
      evidence_status: candidateMeasured ? 'candidate-measured-evidence' : 'represented-evidence',
      provenance: {
        contract_repository: publication.source.repository,
        contract_commit: publication.source.commit,
        contract_path: publication.source.path,
        contract_sha256: publication.source.sha256,
        producer_authenticated: false,
        consumer_reference: 'The-Interdependency/The-Interdependency.github.io:/artifacts/gonol-relationships/'
      },
      information_loss: contract.scale_contract.information_loss,
      hmmm: arity === 7 ? contract.hmmm.concat(['no seven-form geometry or pairing count was inferred by the website']) : contract.hmmm
    };
  }

  function updatePairOutputs(receipt) {
    const byPair = new Map(receipt.pairwise_receipts.map(pair => [pair.left_operand_id.slice(-1) + pair.right_operand_id.slice(-1), pair]));
    for (const element of lab.querySelectorAll('[data-pair-receipt]')) {
      const pairId = element.closest('[data-pair]').dataset.pair;
      element.textContent = byPair.has(pairId) ? JSON.stringify(byPair.get(pairId), null, 2) : 'No pairwise receipt belongs to the selected primitive.';
    }
  }

  async function update() {
    const sequence = ++updateSequence;
    const arity = activeArity();
    updateVisibility(arity);
    const operands = await Promise.all(SLOTS.slice(0, arity).map(assembleOperand));
    if (sequence !== updateSequence) return;

    const selectedOperand = operands.find(operand => operand.slot === publicOperandControl.value) || operands[0];
    updatePublicGonol(selectedOperand);
    renderStage(arity, operands);
    const receipt = assembleReceipt(arity, operands);
    updatePairOutputs(receipt);
    currentReceiptText = JSON.stringify(receipt, null, 2);
    receiptOutput.textContent = currentReceiptText;
    statusOutput.textContent = arity === 7
      ? 'Seven operand identities retained; geometry and pairing remain hmmm.'
      : `Primitive ${arity} receipt updated with ${receipt.pairwise_receipts.length} retained pairwise vesica${receipt.pairwise_receipts.length === 1 ? '' : 's'}.`;
  }

  function scheduleUpdate() {
    window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(update, 80);
  }

  lab.addEventListener('input', scheduleUpdate);
  lab.addEventListener('change', scheduleUpdate);
  downloadButton.addEventListener('click', () => {
    if (!currentReceiptText) return;
    const href = URL.createObjectURL(new Blob([currentReceiptText], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = `gonol-relationship-${activeArity()}-receipt.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
    statusOutput.textContent = 'Relationship receipt downloaded.';
  });

  update();
}
