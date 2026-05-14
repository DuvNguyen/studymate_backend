<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **studymate-backend** (2275 symbols, 4458 relationships, 62 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Type Safety & Constants

- **Tuyệt đối không dùng magic strings** cho các giá trị định danh, role, permission, status. Không viết trực tiếp kiểu `'INSTRUCTOR'`, `'ADMIN'`, `'PUBLISHED'` trong business logic.
- **Ưu tiên Enum hoặc readonly constant object** và tái sử dụng từ một nguồn duy nhất.
- **Centralization**: mọi hằng số logic đặt trong `src/common/constants/` hoặc `src/types/` (single source of truth).
- **Strict typing tại nguồn**: khai báo kiểu rõ ở Entity/DTO/Interface, không đợi đến nơi sử dụng mới ép kiểu bằng `String(...)`.
- **Hạn chế ép kiểu thủ công**: không dùng `any`, `String()`, `as string` trừ tình huống bắt buộc khi tích hợp dữ liệu bên thứ ba chưa có schema.
- **Naming convention**: tên Enum/constant object dùng PascalCase (`UserStatus`), value dùng SCREAMING_SNAKE_CASE (`ACTIVE_ACCOUNT`).

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/studymate-backend/context` | Codebase overview, check index freshness |
| `gitnexus://repo/studymate-backend/clusters` | All functional areas |
| `gitnexus://repo/studymate-backend/processes` | All execution flows |
| `gitnexus://repo/studymate-backend/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
