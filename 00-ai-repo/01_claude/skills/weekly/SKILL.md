---
name: weekly
description: Facilitate weekly review process with reflection, goal alignment, and planning. Create review notes, analyze past week, plan next week. Use on Sundays or whenever doing weekly planning.
allowed-tools: Read, Write, Edit, Glob, Grep, TaskCreate, TaskUpdate, TaskList, TaskGet
user-invocable: true
---

# Weekly Review Skill

Facilitates your weekly review process by creating a review note and guiding reflection on the past week while planning the next.

## Usage

Invoke with `/weekly` or ask Claude to help with your weekly review.

```
/weekly
```

## What This Skill Does

1. **Creates Weekly Review Note**
   - Uses weekly review template
   - Names it with current week's date
   - Places in Goals folder

2. **Guides Review Process**
   - Reviews last week's accomplishments
   - Identifies incomplete tasks
   - Plans upcoming week
   - Aligns with monthly goals

3. **Automates Housekeeping**
   - Archives old daily notes
   - Updates project statuses
   - Cleans up completed tasks

## Review Process Steps

### Step 1: Reflection (10 minutes)
- Review daily notes from past week
- Identify wins and challenges
- Capture lessons learned

### Step 2: Goal Alignment + Project Rollup (10 minutes)
- Check monthly goal progress
- Adjust weekly priorities
- Ensure alignment with yearly goals
- Auto-scan `Projects/*/CLAUDE.md` for current status
- Compile project progress table for the review note

### Step 3: Planning (10 minutes)
- Set ONE big thing for the week
- Include project next-actions when planning week
- Schedule important tasks
- Block time for deep work

## Interactive Prompts

The skill guides you through:

1. **"What were your top 3 wins this week?"**
   - Celebrates progress
   - Builds momentum
   - Documents achievements

2. **"What were your main challenges?"**
   - Identifies obstacles
   - Plans solutions
   - Learns from difficulties

3. **"What's your ONE big thing next week?"**
   - Forces prioritization
   - Creates focus
   - Drives meaningful progress

## Weekly Review Checklist

- [ ] Review all daily notes
- [ ] Process inbox items
- [ ] Update project statuses
- [ ] Check upcoming calendar
- [ ] Review monthly goals
- [ ] Plan next week's priorities
- [ ] Block time for important work
- [ ] Clean digital workspace
- [ ] Archive completed items
- [ ] Commit changes to Git

## Weekly Review Note Format

```markdown
# Weekly Review: YYYY-MM-DD

## Last Week's Wins
1.
2.
3.

## Challenges & Lessons
- Challenge:
- Lesson:

## Goal Progress
### Monthly Goals
- [ ] Goal 1 (XX%)
- [ ] Goal 2 (XX%)

### This Week's Contribution
- [Task] -> [[Goal]]

## Project Progress
| Project | Phase | Progress | Next Action |
|---------|-------|----------|-------------|
| [[ProjectA]] | Active | 60% | [Next step] |
| [[ProjectB]] | Planning | 10% | [Next step] |

## Next Week Planning

### ONE Big Thing
>

### Key Tasks
- [ ]
- [ ]
- [ ]

### Project Next-Actions
- [ ] [ProjectA] - [specific next step]
- [ ] [ProjectB] - [specific next step]

### Time Blocks
- Monday:
- Tuesday:
- Wednesday:
- Thursday:
- Friday:

## Notes
```

## Automation Features

### Auto-Archive
Suggest moving daily notes older than 30 days to Archives.

### Project Status Update
For each active project:
- Update completion percentage
- Note blockers
- Set next actions

### Habit Tracking
Calculate habit success rates from daily notes:
- Count habit checkboxes
- Show completion percentage
- Identify patterns

## Best Practices

### Consistent Timing
- Same day each week (Sunday recommended)
- Same time if possible
- Block calendar time
- Treat as non-negotiable

### Preparation
- Clean inbox before review
- Have calendar ready
- Gather project updates
- Review any feedback

### Follow-through
- Share highlights with team/family
- Update external systems
- Communicate changes
- Celebrate wins

## Task-Based Progress Tracking

The weekly skill uses session tasks to show progress through the 3-phase review.

### Phase Tasks

Create tasks at skill start:

```
TaskCreate:
  subject: "Phase 1: Collect"
  description: "Gather daily notes from past week, extract wins and challenges"
  activeForm: "Collecting daily notes and extracting highlights..."

TaskCreate:
  subject: "Phase 2: Reflect"
  description: "Calculate goal progress, analyze alignment gaps"
  activeForm: "Calculating goal progress and alignment..."

TaskCreate:
  subject: "Phase 3: Plan"
  description: "Identify ONE Big Thing, plan daily focus areas for next week"
  activeForm: "Planning next week's focus..."
```

### Dependencies

Phases must run in order:
```
TaskUpdate: "Phase 2: Reflect", addBlockedBy: [phase-1-collect-id]
TaskUpdate: "Phase 3: Plan", addBlockedBy: [phase-2-reflect-id]
```

Reflect is blocked until Collect completes. Plan is blocked until Reflect completes. This provides visibility into the 30-minute review process.

Mark each task `in_progress` when starting, `completed` when done using TaskUpdate.

Task tools are session-scoped and don't persist between Claude sessions—your actual weekly review content is saved in the review note.

## Agent Team Workflow (Optional)

For a faster, more thorough weekly review, use agent teams to parallelize the collection phase:

```
Team Lead (coordinator)
├── collector agent — Read all daily notes, extract wins/challenges/tasks
├── goal-analyzer agent — Read goal files, calculate progress, find gaps
└── project-scanner agent — Scan Projects/*/CLAUDE.md, get status updates
```

### How to Use
When invoking `/weekly`, you can request the team-based approach:
```
/weekly
"Use the team approach for a thorough review"
```

The team lead:
1. Spawns three agents to work in parallel
2. Collector reads daily notes and extracts highlights
3. Goal-analyzer reads all goal files and calculates progress
4. Project-scanner reads all project CLAUDE.md files for status
5. Team lead synthesizes findings into the weekly review note

This makes the review faster (parallel collection) and more thorough (dedicated analysis per area).

### Vault Health Check (Ad-hoc)

The weekly review can optionally include a vault health check using multiple agents:
- **note-organizer**: Scan for broken links, orphan notes
- **goal-aligner**: Check daily-to-goal alignment
- **inbox-processor**: Check for unprocessed items

Request with: "Include a vault health check in my weekly review"

## Integration

Works with:
- `/daily` - Reviews daily notes from the week
- `/monthly` - Weekly reviews feed monthly rollup
- `/project` - Project status in review
- `/push` - Commit after completing review
- `/onboard` - Load context for informed review
- Goal tracking skill - Progress calculations
