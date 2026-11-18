const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

// Run against the compiled output (see "compile" script).
const { ChangelogBuilder } = require('../out/src/generator');

// The builder resolves a custom template relative to GITHUB_WORKSPACE.
process.env.GITHUB_WORKSPACE = path.join(__dirname, '..');

function build() {
  return new ChangelogBuilder('feat:Features,fix:Bug Fixes', '', 'CHANGELOG.tpl.md');
}

test('parses normal conventional commits', () => {
  const builder = build();
  const data = [
    { commit: { message: 'feat(api): add endpoint' }, html_url: '#' },
    { commit: { message: 'fix: correct typo' }, html_url: '#' },
  ];
  const changelog = builder.generate('1.0.0', data);
  assert.match(changelog, /add endpoint/i);
  assert.match(changelog, /correct typo/i);
});

// Regression test for ReDoS (CWE-1333): a commit-message prefix made of a long
// run of '(' with no ')' must not cause super-linear parsing time.
test('does not hang on crafted parenthesis-heavy prefix (ReDoS)', () => {
  const builder = build();
  const data = [{ commit: { message: '('.repeat(65536) + ':x' }, html_url: '#' }];

  const start = process.hrtime.bigint();
  builder.generate('1.0.0', data);
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

  assert.ok(
    elapsedMs < 1000,
    `parsing a 64KB '(' prefix took ${elapsedMs.toFixed(1)}ms (expected < 1000ms)`
  );
});
