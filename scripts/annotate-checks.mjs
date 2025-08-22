#!/usr/bin/env node
import fs from 'fs';
import process from 'process';
import { Octokit } from 'octokit';

const reportPath = process.argv[2] || 'analyzer-report.json';
const content = fs.readFileSync(reportPath, 'utf8');
const report = JSON.parse(content);

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.error('GITHUB_REPOSITORY env not set. Are we in GitHub Actions?');
  process.exit(1);
}
const [owner, repoName] = repo.split('/');
const sha = process.env.GITHUB_SHA;
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Missing GITHUB_TOKEN');
  process.exit(1);
}

const octokit = new Octokit({ auth: token });

const annotations = (report.unused || []).slice(0, 50).map((u) => ({
  path: u.file.replace(process.cwd() + '/', ''),
  start_line: u.line,
  end_line: u.line,
  annotation_level: 'warning',
  message: `[${u.kind}] ${u.name} appears unused`,
  title: 'Unused code',
}));

const check = await octokit.rest.checks.create({
  owner,
  repo: repoName,
  name: 'Universal Unused Code Analyzer',
  head_sha: sha,
  status: 'completed',
  conclusion: report.summary.totalUnused > 0 ? 'neutral' : 'success',
  output: {
    title: 'Unused Code Report',
    summary: `Found ${report.summary.totalUnused} unused members across ${report.summary.files} files.`,
    annotations,
  },
});

console.log('Check created:', check.data.id);
