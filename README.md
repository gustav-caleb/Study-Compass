## Development and AI assistance

I developed the concept and requirements for Study Compass.
The initial code and automated tests were generated with OpenAI Codex.
I plan to study the implementation and make my own improvements.

# Study Compass

A study tracker for any subject: record assessments, see subject and topic trends,
set goals and choose what to practise next.

## What it does

- Create and manage subjects, units and subtopics. Use paths such as `P3 / Calculus / Differentiation`.
- Record dated assessments with earned and available marks, score type and notes.
- Add optional, partial topic breakdowns. See marks earned and lost.
- View chronological overall and topic percentage graphs, with accessible data tables.
- Set a percentage goal and optional deadline; see the current target gap.
- Get explained practice priorities and maintenance recommendations.
- Edit or delete results and subjects, with confirmation for deletion.
- Automatically save to this browser and export/import JSON backups.
- Explore clearly labelled fictional sample data.
- Use a responsive interface on a phone or computer, without accounts or dependencies.

## Open it

Open `dist/index.html` in a modern browser. For reliable persistent storage, use
the published HTTPS version. File-based preview storage behaviour varies by browser.
No build, Python server, account or API key is required.

**First time publishing? Follow [START-HERE.md](START-HERE.md).**

## Data and scope

Each student's data stays in the browser profile used to enter it. It is not sent
to GitHub, the site owner or an AI service. There is no backend, login, classroom
dashboard or device syncing. Clearing browser data can remove records. Export
backups regularly. A backup replaces the current dataset when imported, after
confirmation. Do not commit personal backups to the public repository.

This first version is a general score tracker, not an Edexcel grade calculator.
UMS can be recorded as a score type, but no qualification grades or A* eligibility
are calculated. Keep assessments comparable: percentages do not adjust for test
difficulty or differences between raw marks and UMS. Topic names are matched
without regard to capitalisation; spelling and paths otherwise need to agree.

Topic paths are descriptive labels, not an automatic aggregation tree. If both
Calculus and Calculus / Differentiation are overlapping parts of one test, enter
only non-overlapping rows. The app checks arithmetic consistency but cannot infer
overlap from the names. A breakdown uses the same scale as its overall result;
do not combine raw topic scores with a converted UMS total.

## How recommendations work

1. Take each topic's latest three scored assessments in date order.
2. Pool their earned marks and available marks to calculate a percentage.
3. Compare with the subject goal, or 80% until a goal is set.
4. Rank below-target topics by their percentage-point shortfall.
5. Keep topics at/above target on a maintenance list; unmeasured topics stay unknown.
6. Add a reminder when a topic has not been measured in over 14 days.

The rule intentionally does not predict grades, claim causal improvement, or
pretend a single result proves mastery. Larger assessments carry more weight in
the pooled percentage. The goal deadline is displayed but is not used to predict
whether a goal is achievable. Assessments on the same date keep their entry order.

## Project map

```text
dist/
  index.html             Page structure and forms
  styles.css             Responsive visual design
  core.js                Validation, percentages, trends, priorities
  app.js                 Interface events, charts, browser saving, backups
tests/
  core.test.cjs          Calculation and data validation tests
.github/workflows/
  pages.yml              Tests and GitHub Pages publication
START-HERE.md            First-time GitHub walkthrough
```

The website uses HTML, CSS and JavaScript because GitHub Pages serves static
websites. Python is not required. This keeps the first release easy to publish.
A Python backend can be a separate later project if accounts and syncing are needed.

## Test

With a recent Node.js installed, from this project folder:

```sh
node --test tests/core.test.cjs
```

The bundled GitHub workflow runs these tests before publishing. Tests cover zero
scores, invalid marks/dates, consistent partial breakdowns, date ordering, missing
topic data, weighted priorities, JSON round-trips and invalid imports.

## Suggested next learning steps

1. Read `core.js`: understand `percentage`, then `series`, then `priorities`.
2. Change a label or colour and publish a small update.
3. Add a test for a new edge case before changing the logic.
4. Consider explicit nested topic IDs and unit summaries.
5. Add qualification-specific grading as a separate module, with verified rules.
6. Only add an ML model after collecting enough suitable data and evaluating it
   against these simple baseline recommendations.

Optional WebMCP support exposes a read-only selected-subject summary in compatible
browsers. It does not affect ordinary website use.
