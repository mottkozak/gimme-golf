import fs from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()

const filePath = (...segments) => path.join(rootDir, ...segments)

const requiredFiles = {
  androidManifest: filePath('android', 'app', 'src', 'main', 'AndroidManifest.xml'),
  androidStrings: filePath('android', 'app', 'src', 'main', 'res', 'values', 'strings.xml'),
  iosInfoPlist: filePath('ios', 'App', 'App', 'Info.plist'),
  iosEntitlements: filePath('ios', 'App', 'App', 'App.entitlements'),
  iosPrivacyManifest: filePath('ios', 'App', 'App', 'PrivacyInfo.xcprivacy'),
  ciWorkflow: filePath('.github', 'workflows', 'ci.yml'),
  releaseWorkflow: filePath('.github', 'workflows', 'native-release.yml'),
  iosIcon: filePath('ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png'),
  androidIcon: filePath('android', 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi', 'ic_launcher.png'),
}

async function readTextIfExists(absolutePath) {
  try {
    return await fs.readFile(absolutePath, 'utf8')
  } catch {
    return null
  }
}

async function fileExists(absolutePath) {
  try {
    await fs.access(absolutePath)
    return true
  } catch {
    return false
  }
}

function expectMatch(errors, content, pattern, message) {
  if (!pattern.test(content)) {
    errors.push(message)
  }
}

async function run() {
  const errors = []

  for (const [label, absolutePath] of Object.entries(requiredFiles)) {
    if (!(await fileExists(absolutePath))) {
      errors.push(`Missing required file (${label}): ${path.relative(rootDir, absolutePath)}`)
    }
  }

  const androidManifest = await readTextIfExists(requiredFiles.androidManifest)
  const androidStrings = await readTextIfExists(requiredFiles.androidStrings)
  const iosInfoPlist = await readTextIfExists(requiredFiles.iosInfoPlist)
  const iosEntitlements = await readTextIfExists(requiredFiles.iosEntitlements)
  const iosPrivacyManifest = await readTextIfExists(requiredFiles.iosPrivacyManifest)
  const ciWorkflow = await readTextIfExists(requiredFiles.ciWorkflow)

  if (androidManifest) {
    expectMatch(
      errors,
      androidManifest,
      /android\.permission\.POST_NOTIFICATIONS/,
      'Android manifest must include POST_NOTIFICATIONS permission for reminder UX.',
    )
    expectMatch(
      errors,
      androidManifest,
      /<data android:scheme="gimmegolf" android:host="auth" android:pathPrefix="\/callback" \/>/,
      'Android manifest must include native auth callback deep-link (gimmegolf://auth/callback).',
    )
    expectMatch(
      errors,
      androidManifest,
      /<intent-filter android:autoVerify="true">[\s\S]*android:scheme="https" android:host="gimme-golf\.app"/,
      'Android manifest must include auto-verified HTTPS app links for gimme-golf.app.',
    )
    expectMatch(
      errors,
      androidManifest,
      /android:networkSecurityConfig="@xml\/network_security_config"/,
      'Android manifest must reference a network security config.',
    )
  }

  if (androidStrings) {
    expectMatch(
      errors,
      androidStrings,
      /<string name="custom_url_scheme">gimmegolf<\/string>/,
      'Android strings.xml custom_url_scheme must match the native auth scheme.',
    )
  }

  if (iosInfoPlist) {
    expectMatch(
      errors,
      iosInfoPlist,
      /<key>CFBundleURLSchemes<\/key>[\s\S]*<string>gimmegolf<\/string>/,
      'iOS Info.plist must include gimmegolf URL scheme callback.',
    )
    expectMatch(
      errors,
      iosInfoPlist,
      /<key>NSPhotoLibraryAddUsageDescription<\/key>/,
      'iOS Info.plist must include NSPhotoLibraryAddUsageDescription copy.',
    )
  }

  if (iosEntitlements) {
    expectMatch(
      errors,
      iosEntitlements,
      /applinks:gimme-golf\.app/,
      'iOS entitlements must include associated domains for gimme-golf.app.',
    )
  }

  if (iosPrivacyManifest) {
    expectMatch(
      errors,
      iosPrivacyManifest,
      /NSPrivacyAccessedAPICategoryUserDefaults/,
      'iOS privacy manifest must declare UserDefaults accessed API usage.',
    )
    expectMatch(
      errors,
      iosPrivacyManifest,
      /CA92\.1/,
      'iOS privacy manifest must include an approved reason for UserDefaults access.',
    )
  }

  const templateAndroidTests = [
    filePath('android', 'app', 'src', 'androidTest', 'java', 'com', 'getcapacitor', 'myapp', 'ExampleInstrumentedTest.java'),
    filePath('android', 'app', 'src', 'test', 'java', 'com', 'getcapacitor', 'myapp', 'ExampleUnitTest.java'),
  ]

  for (const testPath of templateAndroidTests) {
    if (await fileExists(testPath)) {
      errors.push(`Template native test should be removed: ${path.relative(rootDir, testPath)}`)
    }
  }

  if (ciWorkflow) {
    expectMatch(
      errors,
      ciWorkflow,
      /android-release-build:/,
      'CI workflow must contain mandatory Android release build job.',
    )
    expectMatch(
      errors,
      ciWorkflow,
      /ios-release-build:/,
      'CI workflow must contain mandatory iOS release build job.',
    )
    expectMatch(
      errors,
      ciWorkflow,
      /native-preflight:/,
      'CI workflow must run native preflight checks.',
    )
  }

  if (errors.length > 0) {
    console.error('Native preflight failed:')
    for (const issue of errors) {
      console.error(`- ${issue}`)
    }
    process.exitCode = 1
    return
  }

  console.log('Native preflight passed.')
}

void run()
