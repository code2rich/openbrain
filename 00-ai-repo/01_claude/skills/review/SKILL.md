---
name: review
description: Smart review router. Detects context (morning, Sunday, end of month) and launches the appropriate review workflow. Use anytime for the right review at the right time.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, TaskCreate, TaskUpdate, TaskList, TaskGet
model: sonnet
user-invocable: true
---

# Review Skill

Smart router that detects context and launches the appropriate review workflow.

## Usage

```
/review           # Auto-detect the right review based on time/context
/review daily     # Force daily review
/review weekly    # Force weekly review
/review monthly   # Force monthly review
```

Or simply: "Help me review" — and the right workflow starts.

## Auto-Detection Logic

When invoked without arguments, detect context using these rules:

### 1. Check the Time of Day

```bash
HOUR=$(date +%H)
```

- **Before noon (< 12):** Morning routine — delegate to `/daily` morning workflow
- **After 5 PM (>= 17):** Evening shutdown — delegate to `/daily` evening workflow
- **Midday (12-17):** Midday check-in — delegate to `/daily` midday workflow

### 2. Check the Day of Week

```bash
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
```

- **Sunday (7) or Monday (1):** Weekly review — delegate to `/weekly`
  - Override time-of-day detection
  - Ask: "Ready for your weekly review?" before proceeding

### 3. Check the Day of Month

```bash
DAY_OF_MONTH=$(date +%d)
DAYS_IN_MONTH=$(date -v+1m -v1d -v-1d +%d 2>/dev/null || date -d "$(date +%Y-%m-01) +1 month -1 day" +%d)
```

- **Last 3 days of month (DAY_OF_MONTH >= DAYS_IN_MONTH - 2):** Monthly review — delegate to `/monthly`
  - Override both time-of-day and day-of-week detection
  - Ask: "End of month — ready for your monthly review?" before proceeding

- **First day of month (DAY_OF_MONTH == 1):** Also suggest monthly review
  - "It's the first of the month. Want to do your monthly review for last month?"

### 4. Check Staleness

Before routing, check for overdue reviews:

```bash
# Read weekly review file for last date
WEEKLY_REVIEW="Goals/3. Weekly Review.md"
# If last weekly review > 7 days ago, suggest weekly regardless of day
```

- **Weekly review overdue (>7 days):** Suggest weekly review
  - "Your last weekly review was N days ago. Want to catch up?"
  - If user says no, fall through to time-of-day detection

## Routing Behavior

After detecting context:

1. Tell the user what was detected: "It's Sunday evening — launching your weekly review."
2. Delegate to the appropriate skill's workflow
3. The delegated skill handles everything from there

### Delegation

This skill does NOT duplicate the logic of `/daily`, `/weekly`, or `/monthly`. It:
1. Detects context
2. Informs the user
3. Follows the instructions from the target skill's SKILL.md

### Explicit Override

If the user specifies a type (`/review weekly`), skip auto-detection entirely and go directly to that review type.

## Output on Detection

```markdown
### Review Router

**Time:** 7:15 AM (Morning)
**Day:** Sunday
**Month day:** 15th

**Detected:** Weekly review (Sunday override)
**Last weekly review:** 3 days ago (not overdue)

Launching weekly review...
```

## Edge Cases

- **Multiple triggers** (e.g., last Sunday of month): Monthly takes priority over weekly
- **No daily note exists**: Create one first, then continue with review
- **User says "no" to suggestion**: Fall through to next detection level
- **Explicit argument overrides everything**: `/review monthly` runs monthly review even on a Tuesday morning

## Integration

Works with:
- `/daily` — Morning, midday, and evening routines
- `/weekly` — Full weekly review process
- `/monthly` — Monthly review and planning
- Session init hook — Staleness data already calculated
