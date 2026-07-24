# Graph Report - .  (2026-07-24)

## Corpus Check
- Corpus is ~14,880 words - fits in a single context window. You may not need a graph.

## Summary
- 144 nodes · 205 edges · 10 communities detected
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output
- Edge kinds: contains: 62 · method: 35 · MODIFIES: 32 · calls: 19 · ON_BRANCH: 12 · conceptually_related_to: 8 · has_tool: 7 · PARENT_OF: 7 · has_workflow: 5 · imports_from: 4 · references: 4 · imports: 3 · renders: 3 · describes: 2 · built_with: 1 · provides: 1


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 27 · Candidates: 47
- Excluded: 1 untracked · 23451 ignored · 0 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `6d19fc1`
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

### Community 9 - "Community 9"
Cohesion: 0.40
Nodes (4): fs, path, envPath, envDir

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (5): HISTORY, 4d95ea3 Merge pull request #3 from serrig/develop, 6d19fc1 Merge pull request #2 from serrig/dependabot/npm_and_yarn/npm_and_yarn-8998e6e628, ce85ce2 Bump the npm_and_yarn group across 1 directory with 16 updates, master

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (5): AgeProfileComponent, AuthComponent, app.html - Main Application Template, Three-Mode Authentication UI Flow, Loading State with Spinner

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (11): serverConfig, config, appConfig, serverRoutes, USER, App, 028ae89 adding tests to the code base, 2932650 initial commit (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (4): FetchHandler, flushMicrotasks(), USER, createService()

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (9): UserSession, GameOperationPart, GameOperation, GameService, Game Container UI, Score Board, Target Number Display, Math Operations Grid (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (1): ProfileComponent

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (6): AngularNodeAppEngine, DbUser, db, Pool, agent(), registerAndLogin()

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (17): browserDistFolder, app, angularApp, pool, PgStore, reqHandler, graphify hook-rebuild, SumaMatriculas Project (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (8): Graphify Knowledge Graph, graphify query command, graphify path command, graphify explain command, graphify summary command, graphify review-delta command, PreToolUse Hooks, graphify portable-check

## Knowledge Gaps
- **32 isolated node(s):** `fs`, `path`, `envPath`, `envDir`, `serverConfig` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 3`** (1 nodes): `ProfileComponent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameService` connect `Community 1` to `Community 5`?**
  _High betweenness centrality (0.267) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `envPath` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1225071225071225 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.13538461538461538 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11052631578947368 - nodes in this community are weakly interconnected._