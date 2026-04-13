import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT_DIR = process.cwd()
const FEATURES_DIR = path.join(ROOT_DIR, 'src', 'features')
const GOVERNANCE_FILE = path.join(ROOT_DIR, 'docs', 'module-ownership.json')

function toPosixRelative(filePath) {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join('/')
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function run() {
  const errors = []

  const governanceRaw = await fs.readFile(GOVERNANCE_FILE, 'utf8')
  const governance = JSON.parse(governanceRaw)

  if (!governance || typeof governance !== 'object' || typeof governance.features !== 'object') {
    throw new Error('docs/module-ownership.json must define a top-level "features" object.')
  }

  const featureEntries = await fs.readdir(FEATURES_DIR, { withFileTypes: true })
  const featureNames = featureEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  const configuredFeatureNames = Object.keys(governance.features).sort()

  for (const featureName of featureNames) {
    if (!governance.features[featureName]) {
      errors.push(`Missing module ownership entry for feature: ${featureName}`)
    }
  }

  for (const configuredFeatureName of configuredFeatureNames) {
    if (!featureNames.includes(configuredFeatureName)) {
      errors.push(`Ownership entry references non-existent feature: ${configuredFeatureName}`)
    }
  }

  for (const featureName of configuredFeatureNames) {
    const featureConfig = governance.features[featureName]
    const owners = Array.isArray(featureConfig?.owners) ? featureConfig.owners : []
    const requiredTests = Array.isArray(featureConfig?.requiredTestFiles)
      ? featureConfig.requiredTestFiles
      : []

    if (owners.length === 0 || owners.some((owner) => typeof owner !== 'string' || owner.trim().length === 0)) {
      errors.push(`Feature ${featureName} must include at least one valid owner.`)
    }

    if (
      requiredTests.length === 0 ||
      requiredTests.some((testFile) => typeof testFile !== 'string' || testFile.trim().length === 0)
    ) {
      errors.push(`Feature ${featureName} must include requiredTestFiles entries.`)
      continue
    }

    for (const requiredTestFile of requiredTests) {
      const absoluteRequiredTestPath = path.join(ROOT_DIR, requiredTestFile)
      if (!(await fileExists(absoluteRequiredTestPath))) {
        errors.push(
          `Feature ${featureName} references missing required test file: ${requiredTestFile}`,
        )
      }
    }
  }

  if (errors.length === 0) {
    console.log('Module governance checks passed.')
    return
  }

  console.error('Module governance violations:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }

  console.error(`Checked governance file: ${toPosixRelative(GOVERNANCE_FILE)}`)
  process.exitCode = 1
}

run().catch((error) => {
  console.error('Module governance check failed unexpectedly:', error)
  process.exitCode = 1
})
