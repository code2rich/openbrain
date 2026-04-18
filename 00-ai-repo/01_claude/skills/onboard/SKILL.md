---
name: onboard
description: Interactive vault setup and context loading. On first run, personalizes your vault. On subsequent runs, loads full context. Use at start of session or when Claude needs full vault context.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
model: sonnet
user-invocable: true
---

# Onboard Skill

Interactive vault setup (first run) and context loading (subsequent runs).

## Usage

```
/onboard                    # Full onboard (setup if first run, context load if not)
/onboard Projects/MyProject # Load specific project context
```

## First-Run Setup

If the file `FIRST_RUN` exists in the vault root, this is a new vault. Run the interactive setup:

### Step 1: Welcome
Greet the user and explain what will happen:
- "I'll ask a few questions to personalize your vault (~2 minutes)"
- "Your answers are saved locally in vault-config.json"
- "You can change these anytime by editing that file or running /onboard again"

### Step 2: Ask Questions

Use AskUserQuestion to ask these interactively:

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

### Step 3: Save Configuration

Write `vault-config.json` in the vault root:
```json
{
  "name": "User's name",
  "reviewDay": "Sunday",
  "goalAreas": ["Career & Professional", "Health & Wellness"],
  "workStyle": "Direct and concise",
  "setupDate": "2026-02-15",
  "version": "3.1"
}
```

### Step 4: Personalize CLAUDE.md

Edit the root `CLAUDE.md`:
- Replace `[CUSTOMIZE: Add your personal mission statement here]` with a prompt based on their goal areas
- Update the "Current Focus" section to reference their chosen areas

### Step 5: Remove First-Run Marker

```bash
rm FIRST_RUN
```

### Step 6: Confirm Setup

Tell the user:
- "Your vault is set up! Here's what's available:"
- Brief cascade overview
- "Try `/daily` to start your first morning routine"
- "Try `/review` anytime — it auto-detects the right review type"

Then proceed to the standard context loading below.

## Standard Context Loading (Subsequent Runs)

### What This Skill Does

1. **Discovers Context Files**
   - Searches for all CLAUDE.md files
   - Traverses project directories
   - Respects depth limits

2. **Loads Hierarchical Context**
   - Root CLAUDE.md first (global context)
   - Project-specific CLAUDE.md files
   - Recent daily notes for current state

3. **Scans Active Projects**
   - Auto-discovers all `Projects/*/CLAUDE.md` files
   - Extracts project name, phase, progress, and goal linkage
   - Displays active project count and summary in onboard output

4. **Reads User Preferences**
   - Loads `vault-config.json` if present
   - Applies name, review day, work style preferences
   - Uses goal areas to prioritize context loading

5. **Builds Understanding**
   - Your personal mission/goals
   - Project structures and status
   - Workflow preferences
   - Custom conventions

## Context Hierarchy

```
vault/
├── CLAUDE.md                 # [1] Global context - loaded first
├── Projects/
│   ├── Project A/
│   │   └── CLAUDE.md         # [2] Project context
│   └── Project B/
│       └── CLAUDE.md         # [3] Another project context
└── Areas/
    └── Health/
        └── CLAUDE.md         # [4] Area-specific context
```

## CLAUDE.md File Structure

### Root CLAUDE.md Should Include
```markdown
# System Context for Claude

## Personal Mission
[Your life mission/purpose]

## Current Focus
[What you're working on now]

## Preferences
- Writing style: [Formal/Casual/Technical]
- Detail level: [High/Medium/Low]

## Conventions
- File naming: [Your patterns]
- Tag system: [Your tags]
```

### Project CLAUDE.md Should Include
```markdown
# Project: [Name]

## Overview
[What this project is about]

## Current Status
[Where things stand]

## Key Decisions
[Important choices made]

## Next Steps
[What needs to happen]
```

## Smart Context Loading

### Recent Activity
Automatically considers:
- Last 7 days of daily notes
- Current week's review
- Recently modified projects

### Project Summary
When loading full context, include a project overview:
```markdown
### Active Projects (N)
| Project | Phase | Progress | Goal |
|---------|-------|----------|------|
| [[ProjectA]] | Active | 60% | [[Goal 1]] |
| [[ProjectB]] | Planning | 10% | [[Goal 3]] |
```

### Selective Loading
For focused assistance:
```
/onboard Projects/WebApp      # Only specific project
/onboard Goals                # Only goals context
```

## Use Cases

### Starting a Session
```
/onboard
"Help me plan my day based on my goals"
```

### Project Work
```
/onboard Projects/MyApp
"Help me refactor the authentication module"
```

### Weekly Planning
```
/onboard Goals
"Analyze my week and suggest improvements"
```

## Context Variables

Your CLAUDE.md files can include preferences:

```markdown
## Variables for Claude
- DEFAULT_LANGUAGE: JavaScript
- TIMEZONE: America/New_York
- COMMUNICATION_STYLE: Direct and concise
```

## Best Practices

### Keep Context Updated
- Review CLAUDE.md files monthly
- Update after major decisions
- Remove outdated information
- Add new learnings

### Be Specific
- Clear project descriptions
- Specific preferences
- Concrete examples
- Defined conventions

### Hierarchical Information
- Global → Area → Project → Task
- General → Specific
- Strategic → Tactical

## Privacy & Security

### Never Include in CLAUDE.md
- Passwords or credentials
- Personal identification numbers
- Financial account details
- Private API keys

### Safe Context Examples
- "I work in healthcare technology"
- "My projects involve web development"
- "I prefer morning work sessions"

## Integration

Works with:
- All other skills (provides context)
- `/daily` - Better daily planning with context
- `/weekly` - Informed weekly reviews
- `/monthly` - Monthly review with full context
- `/project` - Project status overview
- Goal tracking - Understand goal cascade
