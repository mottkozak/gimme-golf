import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const rootDir = process.cwd()
const target = (process.argv[2] ?? 'all').toLowerCase()
const normalizedTarget = target === 'android' || target === 'ios' || target === 'all' ? target : 'all'

function formatCommand(cmd, args) {
  return [cmd, ...args].join(' ')
}

function runCommand(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: rootDir,
    encoding: 'utf8',
  })
  return {
    ok: result.status === 0,
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
    error: result.error,
    command: formatCommand(cmd, args),
  }
}

function trimOutput(output) {
  if (!output) {
    return ''
  }
  const normalized = output.replace(/\s+/g, ' ').trim()
  return normalized.length > 200 ? `${normalized.slice(0, 197)}...` : normalized
}

function checkPathExists(absolutePath) {
  try {
    fs.accessSync(absolutePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

function checkPathExecutable(absolutePath) {
  try {
    fs.accessSync(absolutePath, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

function resolveAndroidSdkPath() {
  const envSdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME
  if (envSdk) {
    return envSdk
  }
  const defaultMacSdk = path.join(os.homedir(), 'Library', 'Android', 'sdk')
  return checkPathExists(defaultMacSdk) ? defaultMacSdk : null
}

function runAndroidChecks(errors, notes) {
  const javaVersion = runCommand('java', ['-version'])
  if (!javaVersion.ok) {
    errors.push(
      `Java runtime unavailable. Install a JDK and ensure \`java\` is on PATH. Tried: ${javaVersion.command}`,
    )
  } else {
    notes.push(`Java detected: ${trimOutput(javaVersion.output)}`)
  }

  const gradlewPath = path.join(rootDir, 'android', 'gradlew')
  if (!checkPathExists(gradlewPath)) {
    errors.push('Missing Android Gradle wrapper at android/gradlew.')
  } else if (!checkPathExecutable(gradlewPath)) {
    errors.push('Android Gradle wrapper exists but is not executable (run `chmod +x android/gradlew`).')
  }

  const sdkPath = resolveAndroidSdkPath()
  if (!sdkPath) {
    errors.push(
      'Android SDK path not found. Set ANDROID_SDK_ROOT (or ANDROID_HOME), or install SDK at ~/Library/Android/sdk.',
    )
    return
  }

  notes.push(`Android SDK path: ${sdkPath}`)
  const adbPath = path.join(sdkPath, 'platform-tools', 'adb')
  if (!checkPathExecutable(adbPath)) {
    errors.push(`Android SDK missing executable adb at ${adbPath}. Install SDK platform-tools.`)
  }
}

function runIosChecks(errors, notes) {
  if (process.platform !== 'darwin') {
    errors.push('iOS release builds require macOS with Xcode installed.')
    return
  }

  const xcodeSelect = runCommand('xcode-select', ['-p'])
  if (!xcodeSelect.ok) {
    errors.push(
      `xcode-select path is unavailable. Install/select Xcode CLI tools. Tried: ${xcodeSelect.command}`,
    )
  } else {
    notes.push(`Xcode developer path: ${trimOutput(xcodeSelect.output)}`)
  }

  const xcodebuildVersion = runCommand('xcodebuild', ['-version'])
  if (!xcodebuildVersion.ok) {
    errors.push('xcodebuild is unavailable. Confirm Xcode is installed and accepted license agreements.')
  } else {
    notes.push(`xcodebuild: ${trimOutput(xcodebuildVersion.output)}`)
  }

  const simctlPath = runCommand('xcrun', ['--find', 'simctl'])
  if (!simctlPath.ok) {
    errors.push('Unable to find simctl via xcrun. Simulator tooling may be incomplete.')
  } else {
    notes.push(`simctl path: ${trimOutput(simctlPath.output)}`)
  }

  const simctlDevices = runCommand('xcrun', ['simctl', 'list', 'devices'])
  if (!simctlDevices.ok) {
    const serviceHint = trimOutput(simctlDevices.output)
    errors.push(
      `CoreSimulator service check failed (xcrun simctl list devices). ${serviceHint || 'Start Simulator.app and retry.'}`,
    )
  } else {
    notes.push('CoreSimulator service responded successfully.')
  }
}

function run() {
  const errors = []
  const notes = []

  if (normalizedTarget === 'all' || normalizedTarget === 'android') {
    runAndroidChecks(errors, notes)
  }

  if (normalizedTarget === 'all' || normalizedTarget === 'ios') {
    runIosChecks(errors, notes)
  }

  if (notes.length > 0) {
    console.log('Native toolchain checks:')
    for (const note of notes) {
      console.log(`- ${note}`)
    }
  }

  if (errors.length > 0) {
    console.error('Native release bootstrap checks failed:')
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    console.error(
      'Remediation guide: docs/native-toolchain-remediation.md (Java/SDK/CoreSimulator fix steps). Then rerun the hard gate with `npm run native:toolchain:gate`.',
    )
    process.exitCode = 1
    return
  }

  console.log('Native release bootstrap checks passed.')
}

run()
