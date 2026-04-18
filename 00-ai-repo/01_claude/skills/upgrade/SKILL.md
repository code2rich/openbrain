---
name: upgrade
description: Update vault to the latest version of obsidian-claude-pkm. Creates backup, shows diffs, preserves your content. Use when a new version is available.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
user-invocable: true
---

# Upgrade Skill

Updates your vault's system files to the latest version while preserving all your personal content.

## Usage

```
/upgrade          # Interactive upgrade with backup and diff review
/upgrade check    # Preview what's changed without making modifications
```

## What Gets Updated (System Files)

- `.claude/skills/*/SKILL.md` — Skill definitions
- `.claude/agents/*.md` — Agent configurations
- `.claude/hooks/*.sh` — Automation scripts
- `.claude/rules/*.md` — Convention rules
- `.claude/output-styles/*.md` — Output style definitions
- `.claude/settings.json` — Permissions and hook config
- `CLAUDE.md` — Root context file (merged carefully)
- `Templates/*.md` — Note templates

## What Never Gets Touched (Your Content)

- `Daily Notes/**` — Your daily journal entries
- `Goals/**` — Your goal files and reviews
- `Projects/**` — Your project folders and CLAUDE.md files
- `Archives/**` — Your archived content
- `Inbox/**` — Your captured items
- `CLAUDE.local.md` — Your personal overrides
- `vault-config.json` — Your preferences

## Upgrade Process

### Step 1: Check for Updates

Read the current version from `CLAUDE.md` (look for "System Version:" line).

Compare with the upstream repo. If using git:
```bash
git fetch origin
git log HEAD..origin/main --oneline
```

If not a git repo or no remote, inform user they need to download the latest `vault-template/` manually.

### Step 2: Create Backup

Before any changes, create a timestamped backup:
```bash
BACKUP_DIR=".backup/upgrade-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r .claude "$BACKUP_DIR/"
cp CLAUDE.md "$BACKUP_DIR/"
cp -r Templates "$BACKUP_DIR/" 2>/dev/null
```

Tell the user: "Backup created at $BACKUP_DIR"

### Step 3: Diff Review

For each system file that differs from upstream:
1. Show a summary of what changed (additions, removals, modifications)
2. Ask user to confirm: "Apply this update? (yes/skip/stop)"
3. If yes: apply the change
4. If skip: leave this file unchanged
5. If stop: halt the upgrade (backup remains, partial changes preserved)

### Step 4: Apply Changes

For each confirmed file:
- Copy the new version from upstream
- For `CLAUDE.md`: merge carefully — preserve user customizations (Personal Mission, Current Focus sections) while updating system sections (Skills table, version number)
- For `settings.json`: merge — add new permissions/hooks, preserve existing customizations

### Step 5: Post-Upgrade

1. Make hook scripts executable: `chmod +x .claude/hooks/*.sh`
2. Show summary of changes applied
3. Update version in CLAUDE.md
4. Suggest running `/onboard` to reload context

## Check Mode (`/upgrade check`)

When invoked with "check":
1. Compare system files against upstream
2. List files that would be updated with brief change description
3. Show version numbers (current → available)
4. Do NOT make any changes
5. Suggest running `/upgrade` to apply

## Output Format

```markdown
## Upgrade Check

**Current version:** 3.0 (The Cascade)
**Available version:** 3.1

### Files to Update
| File | Change Summary |
|------|---------------|
| `.claude/skills/daily/SKILL.md` | Added cascade context surfacing |
| `.claude/agents/goal-aligner.md` | Added memory: project |
| `.claude/hooks/session-init.sh` | Added priority surfacing |

### New Files
- `.claude/skills/review/SKILL.md` — Smart review router
- `.claude/hooks/skill-discovery.sh` — Auto-list skills

### No Changes Needed
- `.claude/rules/` — Already up to date

Run `/upgrade` to apply these updates (backup will be created first).
```

## Safety Features

- Complete backup before any modification
- File-by-file confirmation
- Can be stopped at any point
- User content folders are never touched
- `CLAUDE.local.md` personal overrides preserved
- Backup includes restoration instructions

## Error Handling

- If no git remote: guide user to download latest vault-template manually
- If backup fails: abort entire upgrade
- If a file copy fails: report error, continue with next file
- Always leave vault in a usable state

## Integration

Works with:
- `/onboard` — Reload context after upgrade
- Session init hook — Will reflect updated priorities
