import { defineMsdmdCollection } from "./.agents/skills/msdmd/collection";

export default defineMsdmdCollection({
  "declarations": [
    {
      "block": "MODULE_BUILD",
      "fields": {
        "entrypoint": "npm run build",
        "purpose": "Build the static-first public knowledge system, render exact distributed-textbook Markdown and LaTeX as static MathML, and copy deliberate fallback artifacts.",
        "tests": "tests/site-contract.test.mjs, tests/math-rendering.test.mjs, tests/generated-site.test.mjs"
      },
      "file": ".eleventy.js",
      "id": "eleventy_site_configuration"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "network_boundary": "internal",
        "owner": "Erin Spencer",
        "pii": "none",
        "secrets": "none",
        "side_effects": "browser processes, loopback listener",
        "storage_boundary": "read",
        "summary": "Launches Chromium and a loopback-only static server against generated public files.",
        "user_data_boundary": "none"
      },
      "file": "playwright.config.mjs",
      "id": "generated_site_browser_harness_boundary"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "internal_surface": "Playwright webServer and Chromium test configuration",
        "module_kind": "instrument",
        "module_name": "playwright-config",
        "network_boundary": "internal",
        "owner": "Erin Spencer",
        "public_surface": "npm run test:browser, npm run test:e2e, npm run test:a11y",
        "rollback": "remove browser scripts, workflow steps, and static test server together",
        "rollout": "required by pull-request and Pages workflows",
        "storage_boundary": "read",
        "summary": "Configures browser, route, static-math, and automated accessibility checks against the generated site.",
        "tests": "tests/site.spec.mjs, tests/math.spec.mjs, tests/accessibility.spec.mjs",
        "user_data_boundary": "none"
      },
      "file": "playwright.config.mjs",
      "id": "generated_site_browser_harness"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "entrypoint": "npm run audit:workflows",
        "purpose": "Refuse unpinned, tag-pinned, stale, or unapproved GitHub workflow actions before build/deploy.",
        "tests": "npm run check"
      },
      "file": "scripts/audit-workflows.mjs",
      "id": "workflow_action_audit"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "internal_surface": "slug, boundedRouteSlug, canonicalHeadingLevel, parseDefinitionLine, extractNoteMarkers",
        "module_kind": "engine",
        "module_name": "canon-parser",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "public_surface": "parseCanon, detectHeading, extractNotes",
        "rollback": "restore the prior parser version and remove nested heading-parent edges",
        "rollout": "imported by scripts/parse-canon.mjs during every canon refresh",
        "storage_boundary": "none",
        "summary": "Parses canonical or recovery text into stable sections, nested heading units, notes, routes, and provenance-bearing hashes.",
        "tests": "tests/canon-parser.test.mjs, tests/canon-integrity.test.mjs",
        "user_data_boundary": "none"
      },
      "file": "scripts/canon-parser.mjs",
      "id": "canon_parser_core"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "failure": "falls back to the repository mirror and records fallback=true",
        "network": "read-only HTTPS request to allowlisted GitHub API and raw content endpoints",
        "storage": "writes generated snapshots beneath src/_data/snapshots"
      },
      "file": "scripts/fetch-canon.mjs",
      "id": "canon_network_boundary"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "entrypoint": "npm run refresh:canon",
        "purpose": "Retrieve the Wayseer canonical text or preserve a visibly labeled local recovery mirror.",
        "tests": "tests/canon-integrity.test.mjs"
      },
      "file": "scripts/fetch-canon.mjs",
      "id": "canonical_source_fetch"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "failure": "preserves last-known-good data with fallback=true, including reviewed editorial fields",
        "network": "reads only allowlisted HTTPS GitHub API endpoints; optional token raises rate limits",
        "storage": "writes generated and last-known-good JSON snapshots"
      },
      "file": "scripts/fetch-github-org.mjs",
      "id": "github_public_metadata"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "entrypoint": "npm run refresh:github",
        "purpose": "Build public project pages from GitHub facts plus reviewed repository manifests or central overrides.",
        "tests": "tests/repo-coverage.test.mjs, tests/offline-project-snapshot.test.mjs"
      },
      "file": "scripts/fetch-github-org.mjs",
      "id": "organization_project_map"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "optional GitHub read token",
        "network_boundary": "external read-only",
        "owner": "Erin Spencer",
        "pii": "none",
        "secrets": "GITHUB_TOKEN is passed only as an HTTPS authorization header and never written",
        "side_effects": "generated dataset and snapshot writes",
        "storage_boundary": "write beneath src/_data/generated and src/_data/snapshots",
        "summary": "Reads only the eight declared chapter files from allowlisted GitHub endpoints.",
        "user_data_boundary": "none"
      },
      "file": "scripts/fetch-textbook.mjs",
      "id": "distributed_textbook_network_boundary"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "optional read-only GITHUB_TOKEN",
        "internal_surface": "allowlisted GitHub API and raw-file retrieval, chapter-source validation, snapshot fallback",
        "module_kind": "service",
        "module_name": "fetch-textbook",
        "network_boundary": "allowlisted read-only HTTPS to api.github.com and raw.githubusercontent.com",
        "owner": "Erin Spencer",
        "public_surface": "npm run refresh:textbook, generated.textbook",
        "rollback": "remove refresh:textbook and the generated chapter routes; source repositories remain unchanged",
        "rollout": "required by refresh:data before validation and Eleventy generation",
        "storage_boundary": "writes generated textbook data and a last-known-good snapshot",
        "summary": "Resolves chapters zero through seven from their owning repositories and emits one provenance-bearing reading dataset.",
        "tests": "tests/textbook-integrity.test.mjs, tests/generated-site.test.mjs, tests/site.spec.mjs",
        "user_data_boundary": "none"
      },
      "file": "scripts/fetch-textbook.mjs",
      "id": "distributed_textbook_fetch"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "pii": "none",
        "secrets": "none",
        "side_effects": "build fails when a recognized math expression cannot be parsed",
        "storage_boundary": "none",
        "summary": "Converts repository-controlled TeX expressions to static MathML with untrusted commands disabled and bounded expansion and size.",
        "user_data_boundary": "none"
      },
      "file": "scripts/markdown-math.mjs",
      "id": "static_textbook_math_rendering_boundary"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "internal_surface": "bracket and AMS block rules, inline delimiter rule, fail-closed Temml rendering",
        "module_kind": "adapter",
        "module_name": "markdown-math",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "public_surface": "installMathRenderer(markdownIt)",
        "rollback": "remove installMathRenderer and the Temml dependency; exact chapter Markdown remains available through provenance links",
        "rollout": "installed into the repository-owned markdown-it instance in .eleventy.js",
        "storage_boundary": "none",
        "summary": "Recognizes the textbook's TeX delimiters before Markdown escaping and emits static MathML during the Eleventy build.",
        "tests": "tests/math-rendering.test.mjs, tests/generated-site.test.mjs, tests/site.spec.mjs",
        "user_data_boundary": "none"
      },
      "file": "scripts/markdown-math.mjs",
      "id": "static_textbook_math_renderer"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "pii": "none",
        "secrets": "none",
        "side_effects": "generated canon file",
        "storage_boundary": "write",
        "summary": "Reads canon snapshots and writes generated canon JSON.",
        "user_data_boundary": "none"
      },
      "file": "scripts/parse-canon.mjs",
      "id": "canon_materialization_boundary"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "internal_surface": "parseCanon invocation and generated JSON write",
        "module_kind": "worker",
        "module_name": "parse-canon",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "public_surface": "npm run refresh:canon",
        "rollback": "restore the previous parser implementation and generated-data contract",
        "rollout": "invoked after scripts/fetch-canon.mjs in refresh:data",
        "storage_boundary": "write",
        "summary": "Reads the selected canon snapshot and writes provenance-bearing generated canon data.",
        "tests": "tests/canon-parser.test.mjs, tests/canon-integrity.test.mjs",
        "user_data_boundary": "none"
      },
      "file": "scripts/parse-canon.mjs",
      "id": "canon_structure_materializer"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "failure": "exits immediately when any preparation command fails",
        "network": "disabled by OFFLINE=1",
        "storage": "refreshes generated JSON from repository recovery mirrors and last-known-good snapshots"
      },
      "file": "scripts/prepare-tests.mjs",
      "id": "offline_test_preparation"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "entrypoint": "npm test via the pretest lifecycle",
        "purpose": "Regenerate canon, project, and distributed-textbook data deterministically before npm test without requiring network access or a full site build.",
        "tests": "tests/canon-integrity.test.mjs, tests/textbook-integrity.test.mjs, tests/repo-coverage.test.mjs"
      },
      "file": "scripts/prepare-tests.mjs",
      "id": "offline_test_data_preparation"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "network_boundary": "internal",
        "owner": "Erin Spencer",
        "pii": "none",
        "secrets": "none",
        "side_effects": "loopback listener",
        "storage_boundary": "read",
        "summary": "Reads generated files and exposes them only on a loopback HTTP test server.",
        "user_data_boundary": "none"
      },
      "file": "scripts/serve-static.mjs",
      "id": "generated_site_test_server_boundary"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "internal_surface": "safePath and static response handler",
        "module_kind": "service",
        "module_name": "serve-static",
        "network_boundary": "internal",
        "owner": "Erin Spencer",
        "public_surface": "http://127.0.0.1:4173 during Playwright runs",
        "rollback": "remove with Playwright webServer configuration and browser checks",
        "rollout": "started automatically by playwright.config.mjs",
        "storage_boundary": "read",
        "summary": "Serves the generated site locally for browser and accessibility release checks.",
        "tests": "tests/site.spec.mjs, tests/accessibility.spec.mjs",
        "user_data_boundary": "none"
      },
      "file": "scripts/serve-static.mjs",
      "id": "generated_site_test_server"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "pii": "none",
        "secrets": "none",
        "side_effects": "none",
        "storage_boundary": "read",
        "summary": "Reads generated and snapshot artifacts to enforce release integrity.",
        "user_data_boundary": "none"
      },
      "file": "scripts/validate-content.mjs",
      "id": "generated_content_validation_boundary"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "internal_surface": "canon snapshot digest, heading hierarchy, distributed-textbook provenance, and repository-route assertions",
        "module_kind": "instrument",
        "module_name": "validate-content",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "public_surface": "npm run validate",
        "rollback": "remove the gate only with an explicit replacement preserving provenance, hierarchy, textbook, and route checks",
        "rollout": "required by npm run build and npm run check",
        "storage_boundary": "read",
        "summary": "Refuses deployment when canon identity, heading hierarchy, textbook coverage, snapshot integrity, generated route coverage, or recovery artifacts drift.",
        "tests": "tests/canon-parser.test.mjs, tests/canon-integrity.test.mjs, tests/textbook-integrity.test.mjs, tests/repo-coverage.test.mjs, tests/site-contract.test.mjs",
        "user_data_boundary": "none"
      },
      "file": "scripts/validate-content.mjs",
      "id": "generated_content_gate"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "pii": "none",
        "secrets": "none",
        "side_effects": "none",
        "storage_boundary": "read",
        "summary": "Reads canon data and article sources to detect quotation or note drift.",
        "user_data_boundary": "none"
      },
      "file": "scripts/verify-article-canon.mjs",
      "id": "article_canon_verification_boundary"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "internal_surface": "article blockquote extraction and normalized canon comparison",
        "module_kind": "instrument",
        "module_name": "verify-article-canon",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "public_surface": "npm run validate",
        "rollback": "replace only with an equally strict generated excerpt mechanism",
        "rollout": "required by validate before Eleventy generation",
        "storage_boundary": "read",
        "summary": "Verifies every public rights-article page reproduces its complete canonical excerpt and canonical notes.",
        "tests": "npm run validate against current generated canon and src/articles",
        "user_data_boundary": "none"
      },
      "file": "scripts/verify-article-canon.mjs",
      "id": "article_canon_exactness_gate"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "network_boundary": "external",
        "owner": "Erin Spencer",
        "pii": "none",
        "secrets": "none",
        "side_effects": "bounded external GET requests",
        "storage_boundary": "none",
        "summary": "Reads public HTTPS build identity from Pages and the custom domain.",
        "user_data_boundary": "none"
      },
      "file": "scripts/verify-live-deployment.mjs",
      "id": "public_site_verification_boundary"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "internal_surface": "bounded HTTPS retries and build.json identity comparison",
        "module_kind": "instrument",
        "module_name": "verify-live-deployment",
        "network_boundary": "external",
        "owner": "Erin Spencer",
        "public_surface": "node scripts/verify-live-deployment.mjs <base-url> <expected-commit>",
        "rollback": "remove only when replaced by another public commit-identity gate",
        "rollout": "required after actions/deploy-pages completes",
        "storage_boundary": "none",
        "summary": "Refuses a green Pages deployment until the public build identity matches the deployed commit.",
        "tests": ".github/workflows/pages.yml deployment contact",
        "user_data_boundary": "none"
      },
      "file": "scripts/verify-live-deployment.mjs",
      "id": "live_deployment_truth_gate"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "pii": "none",
        "secrets": "none",
        "side_effects": "build.json write",
        "storage_boundary": "write",
        "summary": "Reads canon and textbook provenance and writes public build identity into the generated site.",
        "user_data_boundary": "none"
      },
      "file": "scripts/write-build-info.mjs",
      "id": "public_build_identity_boundary"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "internal_surface": "git commit resolution, canonical provenance projection, chapter-source identity projection",
        "module_kind": "worker",
        "module_name": "write-build-info",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "public_surface": "_site/build.json",
        "rollback": "remove build.json and both live identity checks together",
        "rollout": "runs at the end of npm run build",
        "storage_boundary": "write",
        "summary": "Publishes machine-readable site, canon, and distributed-textbook identities for post-deployment verification.",
        "tests": "tests/generated-site.test.mjs, tests/textbook-integrity.test.mjs",
        "user_data_boundary": "none"
      },
      "file": "scripts/write-build-info.mjs",
      "id": "public_build_identity"
    },
    {
      "block": "BOUNDARIES",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "pii": "none",
        "secrets": "none",
        "side_effects": "none",
        "storage_boundary": "read beneath src/_data/research only",
        "summary": "Reads allowlisted repository-local YAML ledgers during static-site generation and returns parsed arrays.",
        "user_data_boundary": "none"
      },
      "file": "src/_data/research_data.js",
      "id": "article_lab_research_data_storage_boundary"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "admin_only": "false",
        "auth_boundary": "none",
        "internal_surface": "validateLedgerPaths, readYamlList, readYamlLedgers",
        "module_kind": "adapter",
        "module_name": "research_data",
        "network_boundary": "none",
        "owner": "Erin Spencer",
        "public_surface": "research_data.sources, research_data.claims",
        "rollback": "restore direct two-file reads and remove the manifest-declared tranche files",
        "rollout": "loaded automatically by Eleventy from src/_data/research_data.js",
        "storage_boundary": "read the repository-owned research manifest and its declared YAML ledgers",
        "summary": "Loads manifest-declared reviewed research source and claim ledgers into one explicit Eleventy global-data object.",
        "tests": "tests/research-ledger.test.mjs, tests/generated-site.test.mjs",
        "user_data_boundary": "none"
      },
      "file": "src/_data/research_data.js",
      "id": "article_lab_research_data_adapter"
    },
    {
      "block": "MODULE_BUILD",
      "fields": {
        "entrypoint": "loaded with defer from the base layout",
        "purpose": "Add a compact mobile navigation toggle without hiding static content.",
        "tests": "tests/site-contract.test.mjs"
      },
      "file": "src/assets/js/site.js",
      "id": "optional_site_enhancement"
    }
  ],
  "edges": [
    {
      "from": "article_canon_verification_boundary",
      "kind": "owns",
      "source_block": "BOUNDARIES",
      "source_id": "article_canon_verification_boundary",
      "to": "Erin Spencer"
    },
    {
      "from": "article_lab_research_data_storage_boundary",
      "kind": "owns",
      "source_block": "BOUNDARIES",
      "source_id": "article_lab_research_data_storage_boundary",
      "to": "Erin Spencer"
    },
    {
      "from": "canon_materialization_boundary",
      "kind": "owns",
      "source_block": "BOUNDARIES",
      "source_id": "canon_materialization_boundary",
      "to": "Erin Spencer"
    },
    {
      "from": "distributed_textbook_network_boundary",
      "kind": "owns",
      "source_block": "BOUNDARIES",
      "source_id": "distributed_textbook_network_boundary",
      "to": "Erin Spencer"
    },
    {
      "from": "generated_content_validation_boundary",
      "kind": "owns",
      "source_block": "BOUNDARIES",
      "source_id": "generated_content_validation_boundary",
      "to": "Erin Spencer"
    },
    {
      "from": "generated_site_browser_harness_boundary",
      "kind": "owns",
      "source_block": "BOUNDARIES",
      "source_id": "generated_site_browser_harness_boundary",
      "to": "Erin Spencer"
    },
    {
      "from": "generated_site_test_server_boundary",
      "kind": "owns",
      "source_block": "BOUNDARIES",
      "source_id": "generated_site_test_server_boundary",
      "to": "Erin Spencer"
    },
    {
      "from": "public_build_identity_boundary",
      "kind": "owns",
      "source_block": "BOUNDARIES",
      "source_id": "public_build_identity_boundary",
      "to": "Erin Spencer"
    },
    {
      "from": "public_site_verification_boundary",
      "kind": "owns",
      "source_block": "BOUNDARIES",
      "source_id": "public_site_verification_boundary",
      "to": "Erin Spencer"
    },
    {
      "from": "static_textbook_math_rendering_boundary",
      "kind": "owns",
      "source_block": "BOUNDARIES",
      "source_id": "static_textbook_math_rendering_boundary",
      "to": "Erin Spencer"
    },
    {
      "from": "article_canon_exactness_gate",
      "kind": "owns",
      "source_block": "MODULE_BUILD",
      "source_id": "article_canon_exactness_gate",
      "to": "Erin Spencer"
    },
    {
      "from": "article_lab_research_data_adapter",
      "kind": "owns",
      "source_block": "MODULE_BUILD",
      "source_id": "article_lab_research_data_adapter",
      "to": "Erin Spencer"
    },
    {
      "from": "canon_parser_core",
      "kind": "owns",
      "source_block": "MODULE_BUILD",
      "source_id": "canon_parser_core",
      "to": "Erin Spencer"
    },
    {
      "from": "canon_structure_materializer",
      "kind": "owns",
      "source_block": "MODULE_BUILD",
      "source_id": "canon_structure_materializer",
      "to": "Erin Spencer"
    },
    {
      "from": "distributed_textbook_fetch",
      "kind": "owns",
      "source_block": "MODULE_BUILD",
      "source_id": "distributed_textbook_fetch",
      "to": "Erin Spencer"
    },
    {
      "from": "generated_content_gate",
      "kind": "owns",
      "source_block": "MODULE_BUILD",
      "source_id": "generated_content_gate",
      "to": "Erin Spencer"
    },
    {
      "from": "generated_site_browser_harness",
      "kind": "owns",
      "source_block": "MODULE_BUILD",
      "source_id": "generated_site_browser_harness",
      "to": "Erin Spencer"
    },
    {
      "from": "generated_site_test_server",
      "kind": "owns",
      "source_block": "MODULE_BUILD",
      "source_id": "generated_site_test_server",
      "to": "Erin Spencer"
    },
    {
      "from": "live_deployment_truth_gate",
      "kind": "owns",
      "source_block": "MODULE_BUILD",
      "source_id": "live_deployment_truth_gate",
      "to": "Erin Spencer"
    },
    {
      "from": "public_build_identity",
      "kind": "owns",
      "source_block": "MODULE_BUILD",
      "source_id": "public_build_identity",
      "to": "Erin Spencer"
    },
    {
      "from": "static_textbook_math_renderer",
      "kind": "owns",
      "source_block": "MODULE_BUILD",
      "source_id": "static_textbook_math_renderer",
      "to": "Erin Spencer"
    }
  ],
  "gaps": [],
  "repo": "The-Interdependency/The-Interdependency.github.io"
});
