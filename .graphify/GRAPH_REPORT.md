# Graph Report - .  (2026-07-23)

## Corpus Check
- Corpus is ~9,190 words - fits in a single context window. You may not need a graph.

## Summary
- 111 nodes · 153 edges · 8 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output
- Edge kinds: contains: 39 · method: 35 · MODIFIES: 20 · calls: 17 · conceptually_related_to: 8 · has_tool: 7 · has_workflow: 5 · ON_BRANCH: 4 · references: 4 · imports: 3 · imports_from: 3 · renders: 3 · describes: 2 · built_with: 1 · PARENT_OF: 1 · provides: 1


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 22 · Candidates: 41
- Excluded: 6 untracked · 23505 ignored · 0 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `677db73`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `GameService` - 21 edges
2. `ProfileComponent` - 13 edges
3. `Graphify Knowledge Graph` - 9 edges
4. `SumaMatriculas Project` - 9 edges
5. `App` - 8 edges
6. `AuthComponent` - 5 edges
7. `Game Container UI` - 5 edges
8. `Three-Mode Authentication UI Flow` - 4 edges
9. `AgeProfileComponent` - 3 edges
10. `Development Server (ng serve)` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Production Build (ng build)` --conceptually_related_to--> `browserDistFolder`  [INFERRED]
  README.md → src/server.ts
- `graphify hook-rebuild` --conceptually_related_to--> `SumaMatriculas Project`  [INFERRED]
  CLAUDE.md → README.md
- `app-root Bootstrap Element` --renders--> `App`  [EXTRACTED]
  src/index.html → src/app/app.ts
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
Cohesion: 0.12
Nodes (10): App, appConfig, config, serverConfig, serverRoutes, USER, feature/testing, master (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.19
Nodes (4): GameService, Game Container UI, Score Board, Target Number Display

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (17): graphify hook-rebuild, index.html - Application Entry Point, app-root Bootstrap Element, SumaMatriculas Page Title, Angular CLI v21.2.8, Production Build (ng build), Code Scaffolding (ng generate), Development Server (ng serve) (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (1): ProfileComponent

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (5): AgeProfileComponent, AuthComponent, app.html - Main Application Template, Three-Mode Authentication UI Flow, Loading State with Spinner

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (8): graphify explain command, Graphify Knowledge Graph, graphify path command, graphify query command, graphify review-delta command, graphify summary command, graphify portable-check, PreToolUse Hooks

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (5): GameOperation, GameOperationPart, UserSession, Interactive Formula Inputs, Math Operations Grid

### Community 7 - "Community 7"
Cohesion: 0.40
Nodes (4): envDir, envPath, fs, path

## Knowledge Gaps
- **25 isolated node(s):** `fs`, `path`, `envPath`, `envDir`, `serverConfig` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 3`** (1 nodes): `ProfileComponent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameService` connect `Community 1` to `Community 6`, `Community 4`?**
  _High betweenness centrality (0.337) - this node is a cross-community bridge._
- **Why does `Development Server (ng serve)` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `envPath` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11052631578947368 - nodes in this community are weakly interconnected._