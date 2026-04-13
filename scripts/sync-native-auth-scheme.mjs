import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT_DIR = process.cwd()
const ENV_FILE_PATH = path.join(ROOT_DIR, '.env')
const ENV_EXAMPLE_FILE_PATH = path.join(ROOT_DIR, '.env.example')
const ANDROID_MANIFEST_PATH = path.join(
  ROOT_DIR,
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml',
)
const ANDROID_STRINGS_PATH = path.join(
  ROOT_DIR,
  'android',
  'app',
  'src',
  'main',
  'res',
  'values',
  'strings.xml',
)
const IOS_INFO_PLIST_PATH = path.join(ROOT_DIR, 'ios', 'App', 'App', 'Info.plist')
const DEFAULT_SCHEME = 'gimmegolf'
const DEFAULT_HOST = 'auth'
const DEFAULT_PATH = 'callback'

function isValidScheme(value) {
  return /^[a-z][a-z0-9+.-]*$/.test(value)
}

async function readFileIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

function parseEnvValue(content, key) {
  if (!content) {
    return null
  }

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = content.match(new RegExp(`^\\s*${escapedKey}\\s*=\\s*(.+)\\s*$`, 'm'))
  if (!match) {
    return null
  }

  const rawValue = match[1]?.trim() ?? ''
  const unquotedValue = rawValue.replace(/^['"]|['"]$/g, '').trim()
  return unquotedValue.length > 0 ? unquotedValue : null
}

async function resolveScheme() {
  const envScheme = process.env.VITE_NATIVE_AUTH_SCHEME?.trim().toLowerCase()
  if (envScheme && isValidScheme(envScheme)) {
    return envScheme
  }

  const envContent = await readFileIfExists(ENV_FILE_PATH)
  const envFileScheme = parseEnvValue(envContent, 'VITE_NATIVE_AUTH_SCHEME')?.toLowerCase()
  if (envFileScheme && isValidScheme(envFileScheme)) {
    return envFileScheme
  }

  const envExampleContent = await readFileIfExists(ENV_EXAMPLE_FILE_PATH)
  const exampleScheme = parseEnvValue(envExampleContent, 'VITE_NATIVE_AUTH_SCHEME')?.toLowerCase()
  if (exampleScheme && isValidScheme(exampleScheme)) {
    return exampleScheme
  }

  return DEFAULT_SCHEME
}

async function resolveAuthHostAndPath() {
  const hostFromEnv = process.env.VITE_NATIVE_AUTH_HOST?.trim().toLowerCase()
  const pathFromEnv = process.env.VITE_NATIVE_AUTH_PATH?.trim().replace(/^\/+/, '')

  const envContent = await readFileIfExists(ENV_FILE_PATH)
  const hostFromFile = parseEnvValue(envContent, 'VITE_NATIVE_AUTH_HOST')?.toLowerCase()
  const pathFromFile = parseEnvValue(envContent, 'VITE_NATIVE_AUTH_PATH')?.replace(/^\/+/, '')

  const envExampleContent = await readFileIfExists(ENV_EXAMPLE_FILE_PATH)
  const hostFromExample = parseEnvValue(envExampleContent, 'VITE_NATIVE_AUTH_HOST')?.toLowerCase()
  const pathFromExample = parseEnvValue(envExampleContent, 'VITE_NATIVE_AUTH_PATH')?.replace(/^\/+/, '')

  const host = hostFromEnv || hostFromFile || hostFromExample || DEFAULT_HOST
  const callbackPath = pathFromEnv || pathFromFile || pathFromExample || DEFAULT_PATH

  return { host, callbackPath }
}

function updateAndroidManifest(content, scheme, host, callbackPath) {
  return content.replace(
    /<data\s+android:scheme="[^"]+"\s+android:host="[^"]+"\s+android:pathPrefix="\/[^"]*"\s*\/>/m,
    `<data android:scheme="${scheme}" android:host="${host}" android:pathPrefix="/${callbackPath}" />`,
  )
}

function updateAndroidStrings(content, scheme) {
  return content.replace(
    /(<string name="custom_url_scheme">)([^<]*)(<\/string>)/m,
    `$1${scheme}$3`,
  )
}

function updateIosInfoPlist(content, scheme) {
  return content.replace(
    /(<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>)([^<]*)(<\/string>)/m,
    `$1${scheme}$3`,
  )
}

async function syncNativeFiles() {
  const scheme = await resolveScheme()
  const { host, callbackPath } = await resolveAuthHostAndPath()

  const [androidManifest, androidStrings, iosInfoPlist] = await Promise.all([
    fs.readFile(ANDROID_MANIFEST_PATH, 'utf8'),
    fs.readFile(ANDROID_STRINGS_PATH, 'utf8'),
    fs.readFile(IOS_INFO_PLIST_PATH, 'utf8'),
  ])

  const nextAndroidManifest = updateAndroidManifest(androidManifest, scheme, host, callbackPath)
  const nextAndroidStrings = updateAndroidStrings(androidStrings, scheme)
  const nextIosInfoPlist = updateIosInfoPlist(iosInfoPlist, scheme)

  await Promise.all([
    fs.writeFile(ANDROID_MANIFEST_PATH, nextAndroidManifest, 'utf8'),
    fs.writeFile(ANDROID_STRINGS_PATH, nextAndroidStrings, 'utf8'),
    fs.writeFile(IOS_INFO_PLIST_PATH, nextIosInfoPlist, 'utf8'),
  ])

  console.log(`Native auth callback synced: ${scheme}://${host}/${callbackPath}`)
}

void syncNativeFiles().catch((error) => {
  console.error('Failed to sync native auth scheme:', error)
  process.exitCode = 1
})
