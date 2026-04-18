---
name: adopt
description: Scaffold the PKM system onto an existing Obsidian vault. Scans your vault structure, maps folders interactively, and generates configuration — no template required.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
model: sonnet
user-invocable: true
---

# Adopt Skill

Bring Your Own Vault (BYOV) — install the Claude PKM system onto an existing Obsidian vault.

## Usage

```
/adopt    # Run from the root of your existing Obsidian vault
```

## When to Use

- You have an existing Obsidian vault and want to add the Claude PKM system
- You don't want to start from the vault template
- You want to keep your current folder structure

## Phase 1: Scan Vault Structure

Analyze the existing vault to understand its organization.

### Steps

1. **List top-level directories** using `ls`, excluding system dirs (`.obsidian`, `.git`, `.claude`, `.trash`, `.claude-plugin`)

2. **For each directory**, gather signals:
   - Count `.md` files (using Glob)
   - Check for date-named files (`YYYY-MM-DD*.md`) — indicates daily notes
   - Grep for goal/review/template keywords in filenames and content
   - Check for existing `CLAUDE.md` in subdirs — indicates projects

3. **Detect organization method** based on signals:
   - **PARA**: Folders named Projects, Areas, Resources, Archives
   - **Zettelkasten**: Numeric-prefixed notes, heavy wiki-linking, flat structure
   - **Johnny Decimal**: `00-09`, `10-19` style folder names
   - **LYT (Linking Your Thinking)**: Folders named Atlas, Calendar, Cards, Extras, Sources
   - **Flat**: Few folders, most files at root
   - **Custom**: None of the above patterns match

4. **Present findings** to the user:
   ```
   Vault scan complete!

   Found 342 notes across 8 folders:
     Daily/           → 180 notes (date-named — likely daily notes)
     Projects/        → 45 notes (has CLAUDE.md files — likely projects)
     Goals/           → 12 notes (contains goal keywords)
     Templates/       → 8 notes (contains template keywords)
     Archive/         → 67 notes
     Inbox/           → 15 notes
     Resources/       → 10 notes
     Meeting Notes/   → 5 notes

   Detected method: PARA-like structure
   ```

## Phase 2: Map Folders to Roles

Use AskUserQuestion to confirm or correct the detected mappings.

### Roles to Map

Each role maps a PKM function to a folder in the user's vault:

| Role | Purpose | Detection Signal |
|------|---------|-----------------|
| Daily Notes | Daily journal entries | Date-named files (`YYYY-MM-DD`) |
| Goals | Goal cascade (3-year → weekly) | Files with goal/review keywords |
| Projects | Active projects | Subdirs with CLAUDE.md or project keywords |
| Templates | Reusable note structures | Files with template keywords or in Templates/ |
| Archives | Completed/inactive content | Folder named Archive(s) or with old dates |
| Inbox | Uncategorized captures | Folder named Inbox, or files tagged #inbox |

### Interactive Mapping

For each role, ask the user to confirm or correct:

**Question format (use AskUserQuestion):**
- "Which folder holds your **daily notes**?"
- Options: detected candidate(s), "I don't have one (create it)", "Skip — I don't use this"
- For optional roles (Inbox), include "Skip" as a default

**Edge cases:**
- **Existing CLAUDE.md at root**: Ask the user — back up as `CLAUDE.md.backup` or merge content
- **No candidate for a role**: Offer to create the folder
- **Multiple candidates**: Present all and let the user choose

### Save Mappings

Store the folder mapping for use in later phases:
```
dailyNotes → "Daily"
goals → "Goals"
projects → "Projects"
templates → "Templates"
archives → "Archive"
inbox → "Inbox"     (or null if skipped)
```

## Phase 3: Personalize Preferences

Ask the same 4 questions as `/onboard`:

**Question 1: Your name**
- "What should I call you?"
- Used for personalized prompts and greetings

**Question 2: Preferred review day**
- "What day do you prefer for your weekly review?"
- Options: Sunday (Recommended), Saturday, Monday, Friday
- Used by `/review` auto-detection and session-init nudges

**Question 3: Primary goal areas**
- "Which areas are most important to you right now? (Pick 2-4)"
- Options: Career & Professional, Health & Wellness, Relationships, Personal Growth
- Also offer: Financial, Creativity & Fun, Learning, Other
- multiSelect: true
- Used to customize goal template suggestions

**Question 4: Work style**
- "How do you prefer Claude to interact?"
- Options: Direct and concise (Recommended), Coaching and challenging, Detailed and thorough, Minimal — just do the task
- Sets output style preference

## Phase 4: Generate Configuration

### 4a. Write `settings.json`

Write `.claude/settings.json` with permissions scoped to the user's actual folders:

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Write **/{mapped-daily}/**",
      "Write **/{mapped-goals}/**",
      "Write **/{mapped-projects}/**",
      "Write **/{mapped-templates}/**",
      "Edit **/{mapped-daily}/**",
      "Edit **/{mapped-goals}/**",
      "Edit **/{mapped-projects}/**",
      "Glob",
      "Grep"
    ]
  }
}
```

Replace `{mapped-*}` with actual folder names from Phase 2.

### 4b. Write root `CLAUDE.md`

Generate a root `CLAUDE.md` that describes the user's **actual** vault structure. Use the same format as the template's CLAUDE.md but with:
- Their folder names in the Directory Structure table
- Their goal areas in the System Purpose section
- Their actual skills table (same as template)
- Cascade section adapted to their folder names

If the user had an existing `CLAUDE.md`, merge their content into the appropriate sections (preserve their mission statement, custom conventions, etc.).

### 4c. Write `vault-config.json`

Write `vault-config.json` in the vault root:
```json
{
  "name": "User's name",
  "reviewDay": "Sunday",
  "goalAreas": ["Career & Professional", "Health & Wellness"],
  "workStyle": "Direct and concise",
  "setupDate": "2026-02-17",
  "version": "3.1",
  "adoptedVault": true,
  "folderMapping": {
    "dailyNotes": "Daily",
    "goals": "Goals",
    "projects": "Projects",
    "templates": "Templates",
    "archives": "Archive",
    "inbox": "Inbox"
  }
}
```

### 4d. Set Environment Variables

Write or update `CLAUDE.local.md` with env var exports for hooks:
```markdown
## Environment Overrides

These env vars allow hooks and scripts to find your folders:

<!--
Export these in your shell profile or they'll be set by session-init:
-->
DAILY_NOTES_DIR={mapped daily notes folder}
GOALS_DIR={mapped goals folder}
PROJECTS_DIR={mapped projects folder}
TEMPLATES_DIR={mapped templates folder}
INBOX_DIR={mapped inbox folder}
ARCHIVES_DIR={mapped archives folder}
```

Also create `.claude/hooks/adopt-env.sh` that exports these variables:
```bash
#!/bin/bash
# Environment variables for adopted vault folder mapping
# Generated by /adopt — edit vault-config.json and re-run /adopt to update

export DAILY_NOTES_DIR="{mapped daily notes}"
export GOALS_DIR="{mapped goals}"
export PROJECTS_DIR="{mapped projects}"
export TEMPLATES_DIR="{mapped templates}"
export INBOX_DIR="{mapped inbox}"
export ARCHIVES_DIR="{mapped archives}"
```

Then add a `source` line to `session-init.sh` if not already present:
```bash
# Source adopted vault env vars if present
ADOPT_ENV="$VAULT_PATH/.claude/hooks/adopt-env.sh"
if [ -f "$ADOPT_ENV" ]; then
    source "$ADOPT_ENV"
fi
```

## Phase 5: Scaffold Missing Pieces

Check what's missing and offer to create it. **Always ask before creating.**

### 5a. Goal Cascade Files

If the goals folder is empty or newly created:
- "Your goals folder is empty. Want me to create the goal cascade? (3-year vision, yearly goals, monthly goals, weekly review)"
- If yes: copy the standard templates, adapting paths to the user's folder names
- If no: skip

### 5b. Templates

If the templates folder is empty or newly created:
- "Want me to add standard templates? (Daily, Weekly Review, Project)"
- If yes: copy templates, adapting internal links to the user's folder names
- If no: skip

### 5c. CLAUDE.local.md.template

If `CLAUDE.local.md.template` doesn't exist:
- Copy it from the standard template
- Adapt any folder references

### 5d. Claude Config Directories

Ensure these directories exist (create silently):
- `.claude/skills/` (for future skill additions)
- `.claude/rules/`
- `.claude/hooks/`
- `.claude/agents/`

Copy standard rules files if `.claude/rules/` is empty:
- `markdown-standards.md`
- `productivity-workflow.md`
- `project-management.md`
- `task-tracking.md`

## Phase 6: Verify & Next Steps

### 6a. Validation

Run quick checks:
- `vault-config.json` is valid JSON (read it back)
- All mapped folders exist
- `CLAUDE.md` is present and non-empty
- `.claude/hooks/adopt-env.sh` is present and executable

### 6b. Summary

Present a summary:
```
Adoption complete!

Vault: /path/to/vault
Method: PARA-like (preserved your existing structure)
Mapped folders:
  Daily Notes → Daily/
  Goals       → Goals/
  Projects    → Projects/
  Templates   → Templates/
  Archives    → Archive/
  Inbox       → Inbox/

Created:
  ✓ CLAUDE.md (vault context)
  ✓ vault-config.json (preferences)
  ✓ .claude/hooks/adopt-env.sh (folder mapping)
  ✓ Goal cascade files (4 files)
  ✓ Standard templates (3 files)

Your vault structure is unchanged — only configuration files were added.
```

### 6c. Next Steps

Suggest what to do next:
- "Try `/daily` to create today's note using your vault's structure"
- "Try `/review` for a guided weekly review"
- "Run `/push` to commit these changes to git"
- "Edit `CLAUDE.local.md` for private preferences (not committed to git)"

## Error Handling

- **Not in a vault**: If no `.obsidian` directory found, warn: "This doesn't look like an Obsidian vault. Continue anyway?"
- **Already adopted**: If `vault-config.json` exists with `adoptedVault: true`, ask: "This vault was already adopted. Re-run adoption? (This will regenerate config files.)"
- **Permission errors**: If `.claude/` can't be written, suggest checking permissions
- **Empty vault**: If no `.md` files found, suggest using `/onboard` with the template instead

## Integration

Works with:
- `/onboard` — adopt replaces onboard for existing vaults
- `/daily` — uses mapped daily notes folder
- `/weekly` — uses mapped goals folder
- `/review` — respects adopted vault structure
- `/push` — commits adoption changes
- All hooks — read env vars from `adopt-env.sh`
