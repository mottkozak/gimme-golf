import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const rootDir = process.cwd()
const remediationPath = path.join(rootDir, 'docs', 'native-toolchain-remediation.md')
const summaryPath = process.env.GITHUB_STEP_SUMMARY
const targetArg = (process.argv[2] ?? 'all').toLowerCase()
const normalizedTarget = targetArg === 'android' || targetArg === 'ios' ? targetArg : 'all'

const rerunCommand =
  normalizedTarget === 'android'
    ? 'npm run native:toolchain:gate:android'
    : normalizedTarget === 'ios'
      ? 'npm run native:toolchain:gate:ios'
      : 'npm run native:toolchain:gate'

const directChecks =
  normalizedTarget === 'android'
    ? ['java -version', 'echo $ANDROID_SDK_ROOT', 'echo $ANDROID_HOME']
    : normalizedTarget === 'ios'
      ? ['xcode-select -p', 'xcodebuild -version', 'xcrun simctl list devices']
      : ['java -version', 'xcode-select -p', 'xcodebuild -version', 'xcrun simctl list devices']

function appendStepSummary(lines) {
  if (!summaryPath) {
    return
  }

  try {
    fs.appendFileSync(summaryPath, `${lines.join('\n')}\n`)
  } catch {
    // Non-fatal in local runs.
  }
}

function failWithMessage(messageLines) {
  for (const line of messageLines) {
    console.error(line)
  }
  appendStepSummary([
    '### Native Toolchain Gate Failed',
    '',
    ...messageLines.map((line) => `- ${line}`),
  ])
  process.exitCode = 1
}

if (!fs.existsSync(remediationPath)) {
  failWithMessage([
    'Hard gate blocked: remediation playbook is missing.',
    'Expected file: docs/native-toolchain-remediation.md',
    'Restore the playbook before proceeding with native builds.',
  ])
} else {
  const remediationContent = fs.readFileSync(remediationPath, 'utf8')
  if (
    !remediationContent.includes('## Android remediation') ||
    !remediationContent.includes('## iOS remediation')
  ) {
    failWithMessage([
      'Hard gate blocked: remediation playbook is incomplete.',
      'Required sections: "## Android remediation" and "## iOS remediation".',
      'Update docs/native-toolchain-remediation.md before proceeding.',
    ])
    process.exit(1)
  }

  const checkArgs =
    normalizedTarget === 'all'
      ? ['scripts/native-toolchain-check.mjs']
      : ['scripts/native-toolchain-check.mjs', normalizedTarget]
  const checkResult = spawnSync('node', checkArgs, {
    cwd: rootDir,
    stdio: 'inherit',
  })

  if (checkResult.status !== 0) {
    const relativeRemediationPath = path.relative(rootDir, remediationPath)
    failWithMessage([
      'Hard gate blocked: native toolchain is unhealthy.',
      `Follow remediation steps in ${relativeRemediationPath} before retrying.`,
      `After remediation, rerun: ${rerunCommand}`,
      `Suggested direct checks: ${directChecks.join(' | ')}`,
    ])
  } else {
    appendStepSummary([
      '### Native Toolchain Gate Passed',
      '',
      `- Target: ${normalizedTarget}`,
      '- Native toolchain checks are healthy for this gate.',
    ])
    console.log(`Native toolchain gate passed (${normalizedTarget}).`)
  }
}
