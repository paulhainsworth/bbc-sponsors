# Automated Testing Feedback Loop for AI-Assisted Development

## Overview

This system creates a continuous feedback loop where:
1. Code changes trigger automated tests
2. Test results are automatically reported
3. AI can read results and iterate on fixes
4. Process continues until all tests pass

---

## Architecture

```
┌─────────────────┐
│  Code Change    │
│  (PR/Commit)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GitHub Actions │
│  Run Tests      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Test Results   │
│  (JSON/HTML)    │
└────────┬────────┘
         │
         ├─────────────────┬─────────────────┐
         ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ PR Comment   │  │ GitHub Issue │  │ Test Report  │
│ (AI readable)│  │ (if failed)   │  │ (Artifact)   │
└──────────────┘  └──────────────┘  └──────────────┘
         │
         ▼
┌─────────────────┐
│  AI Reads       │
│  Results        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Fixes Code  │
│  (Iteration)    │
└────────┬────────┘
         │
         └─────────► (Loop back to Code Change)
```

---

## Implementation Plan

### Phase 1: Enhanced Test Reporting

#### 1.1 Test Result JSON Export

Create a script to export test results in a structured format:

```typescript
// tests/scripts/export-results.ts
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Parse Playwright HTML report and extract structured data
// Export as JSON for AI consumption
```

#### 1.2 GitHub Actions Test Reporter

Enhanced workflow that:
- Runs tests
- Generates structured JSON report
- Posts results as PR comment
- Creates GitHub Issue if tests fail
- Uploads detailed HTML report as artifact

#### 1.3 Test Result Format

Structured JSON format for AI consumption:

```json
{
  "summary": {
    "total": 12,
    "passed": 8,
    "failed": 4,
    "skipped": 0,
    "duration": 45000
  },
  "failures": [
    {
      "test": "Sponsor Admin Dashboard - dashboard loads",
      "file": "tests/sponsor-admin.spec.ts",
      "line": 5,
      "error": "Timeout: Element not found",
      "screenshot": "test-results/screenshot.png",
      "trace": "trace.zip",
      "suggestedFix": "Add wait condition for sponsor data to load"
    }
  ],
  "environment": {
    "baseURL": "https://staging.bbc-sponsors.com",
    "browser": "chromium",
    "timestamp": "2024-11-27T11:00:00Z"
  }
}
```

---

### Phase 2: AI Integration

#### 2.1 GitHub Actions PR Comment

Post test results as formatted comment that AI can read:

```yaml
- name: Comment PR with test results
  uses: actions/github-script@v7
  if: github.event_name == 'pull_request'
  with:
    script: |
      const results = require('./test-results.json');
      const comment = `## 🧪 Test Results
      
      **Status**: ${results.summary.failed > 0 ? '❌ Failed' : '✅ Passed'}
      **Passed**: ${results.summary.passed}/${results.summary.total}
      
      ${results.failures.length > 0 ? `
      ### Failures:
      ${results.failures.map(f => `
      - **${f.test}** (${f.file}:${f.line})
        - Error: ${f.error}
        - Suggested Fix: ${f.suggestedFix}
      `).join('\n')}
      ` : ''}
      `;
      
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: comment
      });
```

#### 2.2 GitHub Issue Creation for Failures

Create an issue that AI can read and act on:

```yaml
- name: Create issue for test failures
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      const results = require('./test-results.json');
      const issueBody = `
      ## Automated Test Failure Report
      
      **Test Run**: ${context.runId}
      **Commit**: ${context.sha}
      **Branch**: ${context.ref}
      
      ### Summary
      - Total Tests: ${results.summary.total}
      - Passed: ${results.summary.passed}
      - Failed: ${results.summary.failed}
      
      ### Failed Tests
      ${results.failures.map(f => `
      #### ${f.test}
      - **File**: \`${f.file}\`
      - **Line**: ${f.line}
      - **Error**: \`\`\`
      ${f.error}
      \`\`\`
      - **Screenshot**: [View](${f.screenshot})
      - **Trace**: [Download](${f.trace})
      `).join('\n')}
      
      ### Next Steps
      - [ ] Review test failures
      - [ ] Fix failing tests
      - [ ] Re-run tests to verify fixes
      `;
      
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: `[Automated] Test Failures - ${new Date().toISOString()}`,
        body: issueBody,
        labels: ['automated', 'tests', 'bug']
      });
```

---

### Phase 3: AI Iteration Workflow

#### 3.1 AI Reads Test Results

When you mention test failures, I can:
1. Read the PR comment or GitHub Issue
2. Analyze the failures
3. Identify root causes
4. Propose fixes
5. Implement fixes
6. Wait for next test run
7. Iterate until all pass

#### 3.2 Structured Feedback Format

Use a format that's easy for AI to parse:

```markdown
## Test Failure Analysis

### Failure 1: Sponsor Admin Dashboard
- **Root Cause**: Race condition - store not initialized before navigation
- **Fix**: Add proper wait condition in fixture
- **Files Changed**: `tests/fixtures/auth.ts`
- **Expected Outcome**: Test should wait for store initialization

### Failure 2: Promotion Creation
- **Root Cause**: Missing approval_status column
- **Fix**: Run database migration
- **Files Changed**: N/A (database)
- **Expected Outcome**: Migration adds missing column
```

---

## Implementation Steps

### Step 1: Create Test Result Exporter

```typescript
// tests/scripts/export-results.ts
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Run tests and export results
const result = execSync('npx playwright test --reporter=json', {
  encoding: 'utf-8',
  cwd: process.cwd()
});

// Parse and format for AI
const results = JSON.parse(result);
const formatted = {
  summary: {
    total: results.stats.total,
    passed: results.stats.expected,
    failed: results.stats.unexpected,
    skipped: results.stats.skipped,
    duration: results.stats.duration
  },
  failures: results.suites
    .flatMap(suite => suite.specs)
    .flatMap(spec => spec.tests)
    .filter(test => test.results.some(r => r.status === 'failed'))
    .map(test => ({
      test: test.title,
      file: test.location.file,
      line: test.location.line,
      error: test.results[0].error?.message || 'Unknown error',
      screenshot: test.results[0].attachments?.find(a => a.name === 'screenshot')?.path,
      trace: test.results[0].attachments?.find(a => a.name === 'trace')?.path
    }))
};

writeFileSync('test-results.json', JSON.stringify(formatted, null, 2));
```

### Step 2: Enhanced GitHub Actions Workflow

```yaml
name: Automated Testing with AI Feedback

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      
      - name: Run tests
        id: test
        run: |
          npm test -- --reporter=json --reporter=html
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.STAGING_SERVICE_ROLE_KEY }}
          STAGING_URL: ${{ secrets.STAGING_URL }}
        continue-on-error: true
      
      - name: Export test results
        run: |
          node tests/scripts/export-results.ts
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            test-results.json
            playwright-report/
            test-results/
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
            
            const emoji = results.summary.failed > 0 ? '❌' : '✅';
            const status = results.summary.failed > 0 ? 'Failed' : 'Passed';
            
            let comment = `## ${emoji} Automated Test Results\n\n`;
            comment += `**Status**: ${status}\n`;
            comment += `**Passed**: ${results.summary.passed}/${results.summary.total}\n`;
            comment += `**Duration**: ${(results.summary.duration / 1000).toFixed(1)}s\n\n`;
            
            if (results.failures.length > 0) {
              comment += `### ❌ Failures (${results.failures.length})\n\n`;
              results.failures.forEach((failure, i) => {
                comment += `#### ${i + 1}. ${failure.test}\n`;
                comment += `- **File**: \`${failure.file}\`\n`;
                comment += `- **Line**: ${failure.line}\n`;
                comment += `- **Error**: \`${failure.error}\`\n\n`;
              });
              
              comment += `### 🔧 Suggested Actions\n\n`;
              comment += `1. Review failure details above\n`;
              comment += `2. Check screenshots in test-results artifact\n`;
              comment += `3. Fix issues and push changes\n`;
              comment += `4. Tests will automatically re-run\n\n`;
            }
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
      
      - name: Create issue for failures
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
            
            const issueBody = `# 🧪 Automated Test Failure Report
            
**Test Run**: [Run #${context.runNumber}](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})
**Commit**: ${context.sha.substring(0, 7)}
**Branch**: ${context.ref.replace('refs/heads/', '')}
**Triggered by**: @${context.actor}

## Summary

- **Total Tests**: ${results.summary.total}
- **Passed**: ${results.summary.passed} ✅
- **Failed**: ${results.summary.failed} ❌
- **Duration**: ${(results.summary.duration / 1000).toFixed(1)}s

## Failed Tests

${results.failures.map((f, i) => `
### ${i + 1}. ${f.test}

- **File**: \`${f.file}\`
- **Line**: ${f.line}
- **Error**:
\`\`\`
${f.error}
\`\`\`

`).join('\n')}

## Artifacts

- [Test Report HTML](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})
- [Screenshots](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})

## Next Steps

- [ ] Review test failures
- [ ] Fix failing tests
- [ ] Push fixes (tests will auto-run)
- [ ] Verify all tests pass

---
*This issue was automatically created by the test automation system.*
`;
            
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `[Automated] Test Failures - ${new Date().toISOString().split('T')[0]}`,
              body: issueBody,
              labels: ['automated', 'tests', 'bug']
            });
```

### Step 3: AI Readable Test Results

Format that's easy for AI to parse and act on:

```markdown
## Test Results Summary

**Status**: FAILED
**Passed**: 8/12
**Failed**: 4/12

### Failure Details

1. **test**: "Sponsor Admin Dashboard - dashboard loads"
   - **file**: `tests/sponsor-admin.spec.ts`
   - **line**: 5
   - **error**: "Timeout: Element not found: a[href='/sponsor-admin/profile']"
   - **root_cause**: "Store not initialized before navigation check"
   - **suggested_fix**: "Add waitForStoreInitialization() before checking for links"

2. **test**: "Promotion Creation - can create promotion"
   - **file**: `tests/sponsor-creation.spec.ts`
   - **line**: 15
   - **error**: "Column 'approval_status' does not exist"
   - **root_cause**: "Database migration not run"
   - **suggested_fix**: "Run migration 009_promotion_approval_workflow.sql"
```

---

## Workflow Example

### Scenario: Fixing a Bug

1. **You**: "Fix the promotion creation bug"
2. **Me**: *Makes code changes, commits*
3. **GitHub Actions**: *Runs tests automatically*
4. **GitHub Actions**: *Posts PR comment with results*
5. **Me**: *Reads PR comment, sees 2 tests still failing*
6. **Me**: *Fixes remaining issues, commits*
7. **GitHub Actions**: *Runs tests again*
8. **GitHub Actions**: *Posts updated results - all passing*
9. **You**: *Merges PR*

### Scenario: Adding a Feature

1. **You**: "Add feature X"
2. **Me**: *Implements feature, writes tests*
3. **GitHub Actions**: *Runs tests, some fail*
4. **Me**: *Reads results, fixes issues*
5. **Iterate until all pass**

---

## Benefits

1. **Automatic Feedback**: No manual test running needed
2. **AI Can Iterate**: I can read results and fix issues automatically
3. **Visible Progress**: PR comments show test status
4. **Historical Tracking**: Issues created for failures
5. **Team Awareness**: Everyone sees test status
6. **Prevents Regressions**: Tests run on every change

---

## Setup Requirements

### GitHub Secrets Needed:
- `STAGING_URL` - Staging environment URL
- `STAGING_SUPABASE_URL` - Staging Supabase URL
- `STAGING_SUPABASE_ANON_KEY` - Staging anon key
- `STAGING_SERVICE_ROLE_KEY` - Staging service role key

### Staging Environment:
- Deployed application
- Test database (can be reset between runs)
- Stable URL

---

## Next Steps

1. **Create test result exporter script**
2. **Update GitHub Actions workflow**
3. **Set up staging environment**
4. **Configure GitHub secrets**
5. **Test the feedback loop**

Would you like me to implement this system?

