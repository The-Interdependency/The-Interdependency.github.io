// === MODULE_BUILD ===
// id: webmcp_skill_registry_adapter
//   purpose: Provide deterministic read-only operations over the public human-and-agent view of the website's commit-pinned skill-lib registry projection.
//   entrypoint: imported by /assets/js/webmcp.js, server/mcp-protocol.mjs, and tests
//   tests: tests/webmcp.test.mjs, tests/mcp-server.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: webmcp_skill_registry_read_boundary
//   network: none
//   storage: none
//   user_data: none
//   operational_effects: none; all exported operations are read-only transformations over supplied registry data
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: webmcp_public_catalogue_matches_human_catalogue
//   given: the source registry contains public-facing and internal/specialist skills
//   then: public list/find/inspect/closure expose msdmd metadata-block applications, the exact meta skill, and fresh-making, matching the human card catalogue
//   class: correctness
//
// id: webmcp_registry_smallest_dependency_closure
//   given: a presented registered skill name
//   then: resolveSkillClosure returns that skill plus every presented transitive depends_on prerequisite exactly once in dependency-first order
//   class: correctness
// === END CONTRACTS ===
// Usage: `const registry = createSkillRegistry(data); registry.findSkills({ query: 'documentation' })`.

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function isPresentedSkill(skill) {
  return skill?.kind === 'metadata-block' || skill?.name === 'meta' || skill?.name === 'fresh-making';
}

function publicSkill(skill, source) {
  return {
    name: skill.name,
    kind: skill.kind,
    depends_on: [...skill.depends_on],
    description: skill.description,
    canonical_path: skill.path,
    canonical_url: `https://github.com/${source.repository}/blob/${source.commit}/${skill.path}`
  };
}

export function createSkillRegistry(registryData) {
  if (!registryData?.source?.repository || !registryData?.source?.commit || !Array.isArray(registryData.skills)) {
    throw new Error('invalid skill registry projection');
  }

  const source = registryData.source;
  const skills = registryData.skills.filter(isPresentedSkill);
  const byName = new Map(skills.map(skill => [skill.name, skill]));

  for (const skill of skills) {
    for (const dependency of skill.depends_on) {
      if (!byName.has(dependency)) {
        throw new Error(`presented skill dependency is not presented: ${skill.name} -> ${dependency}`);
      }
    }
  }

  function requireSkill(name) {
    const skill = byName.get(String(name || '').trim());
    if (!skill) throw new Error(`unknown public skill: ${name}`);
    return skill;
  }

  function listSkills({ kind = '' } = {}) {
    const normalizedKind = normalizeText(kind);
    return skills
      .filter(skill => !normalizedKind || normalizeText(skill.kind) === normalizedKind)
      .map(skill => publicSkill(skill, source));
  }

  function findSkills({ query, kind = '', limit = 8 } = {}) {
    const terms = normalizeText(query).split(/\s+/).filter(Boolean);
    const normalizedKind = normalizeText(kind);
    const boundedLimit = Math.max(1, Math.min(Number(limit) || 8, 20));
    if (terms.length === 0) return listSkills({ kind }).slice(0, boundedLimit);

    return skills
      .filter(skill => !normalizedKind || normalizeText(skill.kind) === normalizedKind)
      .map(skill => {
        const name = normalizeText(skill.name);
        const description = normalizeText(skill.description);
        const path = normalizeText(skill.path);
        let score = 0;
        for (const term of terms) {
          if (name === term) score += 8;
          if (name.includes(term)) score += 5;
          if (path.includes(term)) score += 3;
          if (description.includes(term)) score += 2;
        }
        return { skill, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
      .slice(0, boundedLimit)
      .map(item => publicSkill(item.skill, source));
  }

  function inspectSkill({ name } = {}) {
    return publicSkill(requireSkill(name), source);
  }

  function resolveSkillClosure({ name } = {}) {
    const ordered = [];
    const visiting = new Set();
    const visited = new Set();

    function visit(skillName) {
      if (visited.has(skillName)) return;
      if (visiting.has(skillName)) throw new Error(`skill dependency cycle at ${skillName}`);
      visiting.add(skillName);
      const skill = requireSkill(skillName);
      for (const dependency of skill.depends_on) visit(dependency);
      visiting.delete(skillName);
      visited.add(skillName);
      ordered.push(publicSkill(skill, source));
    }

    visit(String(name || '').trim());
    return ordered;
  }

  function getRegistryStatus() {
    return {
      registry_version: registryData.version,
      skill_count: skills.length,
      source_skill_count: registryData.skills.length,
      public_scope: 'metadata-block plus meta plus fresh-making',
      source: { ...source },
      fallback: Boolean(registryData.fallback),
      hmmm: Array.isArray(registryData.hmmm) ? [...registryData.hmmm] : []
    };
  }

  return { listSkills, findSkills, inspectSkill, resolveSkillClosure, getRegistryStatus };
}
