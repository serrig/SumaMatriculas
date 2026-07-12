# Graph Report - .  (2026-06-30)

## Corpus Check
- Corpus is ~2,738 words - fits in a single context window. You may not need a graph.

## Summary
- 74 nodes · 86 edges · 10 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output
- Edge kinds: contains: 28 · method: 14 · conceptually_related_to: 8 · calls: 7 · has_tool: 7 · has_workflow: 5 · references: 4 · imports: 3 · imports_from: 3 · renders: 3 · describes: 2 · built_with: 1 · provides: 1


## Input Scope
- Requested: all
- Resolved: all (source: configured-default)
- Included files: 16 · Candidates: recursive
- Excluded: 0 untracked · 0 ignored · 0 sensitive · 0 missing committed

## Graph Freshness
- Built from Git commit: `2932650`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `GameService` - 16 edges
2. `Graphify Knowledge Graph` - 9 edges
3. `SumaMatriculas Project` - 9 edges
4. `App` - 5 edges
5. `Game Container UI` - 5 edges
6. `AuthComponent` - 4 edges
7. `Three-Mode Authentication UI Flow` - 4 edges
8. `AgeProfileComponent` - 3 edges
9. `Development Server (ng serve)` - 3 edges
10. `app.html - Main Application Template` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Production Build (ng build)` --conceptually_related_to--> `browserDistFolder`  [INFERRED]
  README.md → src/server.ts
- `graphify hook-rebuild` --conceptually_related_to--> `SumaMatriculas Project`  [INFERRED]
  CLAUDE.md → README.md
- `SumaMatriculas Page Title` --conceptually_related_to--> `SumaMatriculas Project`  [EXTRACTED]
  src/index.html → README.md
- `Three-Mode Authentication UI Flow` --references--> `GameService`  [EXTRACTED]
  src/app/app.html → src/app/game.service.ts
- `Math Operations Grid` --conceptually_related_to--> `GameOperation`  [INFERRED]
  src/app/app.html → src/app/game.service.ts

## Hyperedges (group relationships)
- **SumaMatriculas Math Game System** — app_html_game_container, app_html_score_board, app_html_target_number, app_html_operations_grid, app_game_service_gameservice, app_game_service_gameservice_generatenewround, app_game_service_gameservice_updateinput, app_game_service_gameservice_checkwincondition [EXTRACTED 1.00]
- **Three-State Authentication Routing** — app_html_auth_flow, app_auth_component_authcomponent, app_age_profile_component_ageprofilecomponent, app_html_game_container, app_game_service_gameservice, app_game_service_gameservice_initauth, app_game_service_gameservice_fetchprofile [EXTRACTED 1.00]
- **Angular CLI Development Toolchain** — readme_md_angular_cli, readme_md_dev_server, readme_md_build_system, readme_md_code_scaffolding, src_main, src_server, src_server_browserdistfolder, src_server_angularapp [INFERRED 0.85]
- **Graphify Claude Code Integration** — claude_md_graphify_knowledge_graph, claude_md_pretooluse_hooks, claude_md_hook_rebuild, claude_md_portable_check, claude_md_graphify_query, claude_md_graphify_path, claude_md_graphify_explain, claude_md_graphify_summary, claude_md_graphify_review_delta [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.21
Nodes (4): GameService, Game Container UI, Score Board, Target Number Display

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (12): graphify hook-rebuild, Angular CLI v21.2.8, Production Build (ng build), Code Scaffolding (ng generate), Development Server (ng serve), End-to-End Testing (ng e2e), SumaMatriculas Project, Vitest Test Runner (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.20
Nodes (5): AgeProfileComponent, AuthComponent, app.html - Main Application Template, Three-Mode Authentication UI Flow, Loading State with Spinner

### Community 3 - "Community 3"
Cohesion: 0.31
Nodes (4): App, index.html - Application Entry Point, app-root Bootstrap Element, SumaMatriculas Page Title

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (8): graphify explain command, Graphify Knowledge Graph, graphify path command, graphify query command, graphify review-delta command, graphify summary command, graphify portable-check, PreToolUse Hooks

### Community 5 - "Community 5"
Cohesion: 0.40
Nodes (4): GameOperation, GameOperationPart, Interactive Formula Inputs, Math Operations Grid

### Community 6 - "Community 6"
Cohesion: 0.40
Nodes (4): envDir, envPath, fs, path

### Community 7 - "Community 7"
Cohesion: 0.67
Nodes (2): config, serverConfig

### Community 8 - "Community 8"
Cohesion: 1.00
Nodes (1): appConfig

### Community 9 - "Community 9"
Cohesion: 1.00
Nodes (1): serverRoutes

## Knowledge Gaps
- **21 isolated node(s):** `fs`, `path`, `envPath`, `envDir`, `serverConfig` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 7`** (2 nodes): `config`, `serverConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (1 nodes): `appConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (1 nodes): `serverRoutes`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SumaMatriculas Project` connect `Community 1` to `Community 3`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `GameService` connect `Community 0` to `Community 5`, `Community 2`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `Graphify Knowledge Graph` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `envPath` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._