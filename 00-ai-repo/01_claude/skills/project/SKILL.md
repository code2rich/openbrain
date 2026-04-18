---
name: project
description: Create, track, and archive projects linked to goals. The bridge between goals and daily tasks. Use for project creation, status dashboards, and archiving completed work.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, TaskCreate, TaskUpdate, TaskList, TaskGet
model: sonnet
user-invocable: true
---

# Project Skill

Create, track, and archive projects that bridge the gap between goals and daily tasks.

## Usage

```
/project              # Interactive: create new project or view status
/project new          # Create a new project
/project status       # Dashboard of all active projects
/project archive <name>  # Archive a completed project
```

## Commands

### `/project` or `/project new`

Creates a new project folder with a CLAUDE.md context file, interactively linked to a goal.

**Steps:**
1. Read `Goals/1. Yearly Goals.md` to list available goals
2. Ask user which goal this project supports (or "none" for standalone)
3. Ask for project name
4. Create `Projects/<ProjectName>/CLAUDE.md` with structure below
5. If linked to a goal, add `[[Projects/<ProjectName>]]` reference in the yearly goals file

**Project CLAUDE.md Template:**
```markdown
# Project: <Name>

## Overview
[Brief description of what this project achieves]

## Goal Link
Supports: [[1. Yearly Goals#<Goal Name>]]

## Status
- **Phase:** Planning | Active | Review | Complete
- **Progress:** 0%
- **Started:** <date>
- **Target:** <date>

## Key Decisions
- [Decision 1] - [Date] - [Rationale]

## Next Actions
- [ ] [First concrete step]
- [ ] [Second step]

## Notes
[Running log of updates, blockers, learnings]
```

### `/project status`

Scans all `Projects/*/CLAUDE.md` files and displays a dashboard.

**Steps:**
1. Glob for `Projects/*/CLAUDE.md`
2. Read each file, extract: name, status/phase, progress%, goal linkage, next action
3. Display dashboard table

**Output Format:**
```markdown
## Project Dashboard

| Project | Phase | Progress | Goal | Next Action |
|---------|-------|----------|------|-------------|
| ProjectA | Active | 60% | [[Goal 1]] | Review PR |
| ProjectB | Planning | 10% | [[Goal 3]] | Draft spec |

### Summary
- Active projects: N
- Total progress (weighted): X%
- Projects without goal link: [list]
- Stalled projects (no update in 14+ days): [list]
```

### `/project archive <name>`

Moves a completed project to the archives.

**Steps:**
1. Verify `Projects/<name>/` exists
2. Confirm with user before archiving
3. Update project CLAUDE.md status to "Complete" and progress to 100%
4. Move folder: `mv Projects/<name> Archives/Projects/<name>`
5. Create `Archives/Projects/` directory if it doesn't exist
6. Update any goal references to note completion
7. Report what was archived

## Project Naming Conventions

- Use PascalCase for folder names: `Projects/LearnSpanish/`
- Keep names concise but descriptive
- Avoid special characters

## Cascade Integration

Projects are the critical middle layer:

```
Goals/1. Yearly Goals.md     <- "What I want to achieve"
    |
    v
Projects/*/CLAUDE.md         <- "How I'll achieve it" (THIS SKILL)
    |
    v
Daily Notes/*.md             <- "What I'm doing today"
```

When creating tasks in daily notes, reference the project:
```markdown
- [ ] Draft API spec — [[Projects/MyApp/CLAUDE.md|MyApp]]
```

## Task-Based Progress Tracking

### New Project Tasks
```
TaskCreate:
  subject: "Read yearly goals"
  description: "Load goals for project linking"
  activeForm: "Reading yearly goals..."

TaskCreate:
  subject: "Create project structure"
  description: "Create folder and CLAUDE.md for new project"
  activeForm: "Creating project structure..."

TaskCreate:
  subject: "Link project to goal"
  description: "Add project reference to yearly goals file"
  activeForm: "Linking project to goal..."
```

### Status Dashboard Tasks
```
TaskCreate:
  subject: "Scan project files"
  description: "Glob and read all Projects/*/CLAUDE.md files"
  activeForm: "Scanning project files..."

TaskCreate:
  subject: "Generate dashboard"
  description: "Compile status dashboard from project data"
  activeForm: "Generating project dashboard..."
```

Mark each task `in_progress` when starting, `completed` when done.

## Integration

Works with:
- `/daily` - Surface project next-actions in morning routine
- `/weekly` - Project status in weekly review
- `/goal-tracking` - Project progress feeds goal calculations
- `/onboard` - Discover and load project context
- `/push` - Commit project changes
