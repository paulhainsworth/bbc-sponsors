/**
 * Export Playwright test results in a structured JSON format
 * for AI consumption and automated reporting
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  title: string;
  file: string;
  line: number;
  error?: string;
  screenshot?: string;
  trace?: string;
  duration?: number;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

interface ExportedResults {
  summary: TestSummary;
  failures: TestResult[];
  environment: {
    baseURL: string;
    browser: string;
    timestamp: string;
    nodeVersion: string;
  };
}

function extractResultsFromHTML(htmlPath: string): ExportedResults {
  // Playwright HTML report structure
  // We'll parse the JSON data embedded in the HTML
  const html = readFileSync(htmlPath, 'utf-8');
  
  // Extract JSON data from HTML (Playwright embeds it)
  const jsonMatch = html.match(/window\.playwrightReportData = ({.*?});/s);
  if (!jsonMatch) {
    throw new Error('Could not extract test data from HTML report');
  }
  
  const reportData = JSON.parse(jsonMatch[1]);
  
  const failures: TestResult[] = [];
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let totalDuration = 0;
  
  function processSuite(suite: any) {
    if (suite.specs) {
      suite.specs.forEach((spec: any) => {
        if (spec.tests) {
          spec.tests.forEach((test: any) => {
            total++;
            totalDuration += test.results?.[0]?.duration || 0;
            
            const testResult = test.results?.[0];
            if (testResult) {
              if (testResult.status === 'passed') {
                passed++;
              } else if (testResult.status === 'failed') {
                failed++;
                failures.push({
                  title: test.title,
                  file: test.location?.file || 'unknown',
                  line: test.location?.line || 0,
                  error: testResult.error?.message || testResult.error?.stack || 'Unknown error',
                  screenshot: testResult.attachments?.find((a: any) => a.name === 'screenshot')?.path,
                  trace: testResult.attachments?.find((a: any) => a.name === 'trace')?.path,
                  duration: testResult.duration
                });
              } else if (testResult.status === 'skipped') {
                skipped++;
              }
            }
          });
        }
      });
    }
    
    if (suite.suites) {
      suite.suites.forEach((subSuite: any) => processSuite(subSuite));
    }
  }
  
  if (reportData.files) {
    reportData.files.forEach((file: any) => {
      if (file.suites) {
        file.suites.forEach((suite: any) => processSuite(suite));
      }
    });
  }
  
  return {
    summary: {
      total,
      passed,
      failed,
      skipped,
      duration: totalDuration
    },
    failures,
    environment: {
      baseURL: process.env.BASE_URL || 'http://localhost:5173',
      browser: 'chromium',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version
    }
  };
}

function extractResultsFromJSON(jsonPath: string): ExportedResults {
  const json = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  
  const failures: TestResult[] = [];
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let totalDuration = 0;
  
  function processSuite(suite: any) {
    if (suite.specs) {
      suite.specs.forEach((spec: any) => {
        if (spec.tests) {
          spec.tests.forEach((test: any) => {
            total++;
            const testResult = test.results?.[0];
            if (testResult) {
              totalDuration += testResult.duration || 0;
              
              if (testResult.status === 'passed') {
                passed++;
              } else if (testResult.status === 'failed') {
                failed++;
                failures.push({
                  title: test.title,
                  file: test.location?.file || 'unknown',
                  line: test.location?.line || 0,
                  error: testResult.error?.message || testResult.error?.stack || 'Unknown error',
                  screenshot: testResult.attachments?.find((a: any) => a.name === 'screenshot')?.path,
                  trace: testResult.attachments?.find((a: any) => a.name === 'trace')?.path,
                  duration: testResult.duration
                });
              } else if (testResult.status === 'skipped') {
                skipped++;
              }
            }
          });
        }
      });
    }
    
    if (suite.suites) {
      suite.suites.forEach((subSuite: any) => processSuite(subSuite));
    }
  }
  
  if (json.suites) {
    json.suites.forEach((suite: any) => processSuite(suite));
  }
  
  return {
    summary: {
      total,
      passed,
      failed,
      skipped,
      duration: totalDuration
    },
    failures,
    environment: {
      baseURL: process.env.BASE_URL || 'http://localhost:5173',
      browser: 'chromium',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version
    }
  };
}

function main() {
  const reportDir = join(process.cwd(), 'playwright-report');
  const htmlReport = join(reportDir, 'index.html');
  const jsonReport = join(process.cwd(), 'test-results.json');
  
  let results: ExportedResults;
  
  // Try to read from JSON first (if tests were run with --reporter=json)
  if (existsSync(jsonReport)) {
    console.log('Reading results from JSON report...');
    results = extractResultsFromJSON(jsonReport);
  } else if (existsSync(htmlReport)) {
    console.log('Reading results from HTML report...');
    results = extractResultsFromHTML(htmlReport);
  } else {
    console.error('No test results found. Run tests first.');
    process.exit(1);
  }
  
  // Add suggested fixes based on error patterns
  results.failures = results.failures.map(failure => {
    let suggestedFix = '';
    
    if (failure.error?.includes('approval_status')) {
      suggestedFix = 'Run database migration: 009_promotion_approval_workflow.sql';
    } else if (failure.error?.includes('Timeout') || failure.error?.includes('not found')) {
      suggestedFix = 'Add proper wait condition or increase timeout';
    } else if (failure.error?.includes('not authenticated') || failure.error?.includes('session')) {
      suggestedFix = 'Check authentication state - may need to re-run setup script';
    } else if (failure.error?.includes('RLS') || failure.error?.includes('permission')) {
      suggestedFix = 'Check RLS policies or use service role key for admin operations';
    } else {
      suggestedFix = 'Review error message and check related code';
    }
    
    return {
      ...failure,
      suggestedFix
    };
  });
  
  // Write formatted results
  const outputPath = join(process.cwd(), 'test-results-formatted.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   Total: ${results.summary.total}`);
  console.log(`   Passed: ${results.summary.passed} ✅`);
  console.log(`   Failed: ${results.summary.failed} ${results.summary.failed > 0 ? '❌' : ''}`);
  console.log(`   Skipped: ${results.summary.skipped}`);
  console.log(`   Duration: ${(results.summary.duration / 1000).toFixed(1)}s`);
  console.log(`\n📄 Results exported to: ${outputPath}`);
  
  // Exit with error code if tests failed
  if (results.summary.failed > 0) {
    process.exit(1);
  }
}

main();

