import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT_DIR = process.cwd()
const SRC_DIR = path.join(ROOT_DIR, 'src')

const FILE_SIZE_RULES = [
  {
    name: 'ui_tsx_max_lines',
    include: (filePath) =>
      filePath.endsWith('.tsx') &&
      (
        filePath.includes(`${path.sep}src${path.sep}app${path.sep}`) ||
        filePath.includes(`${path.sep}src${path.sep}components${path.sep}`) ||
        filePath.includes(`${path.sep}src${path.sep}features${path.sep}`)
      ),
    maxLines: 900,
  },
  {
    name: 'layer_css_max_lines',
    include: (filePath) =>
      filePath.includes(`${path.sep}src${path.sep}styles${path.sep}layers${path.sep}`) &&
      filePath.endsWith('.css'),
    maxLines: 2200,
  },
  {
    name: 'entry_css_max_lines',
    include: (filePath) => filePath.endsWith(`${path.sep}src${path.sep}styles${path.sep}app.css`),
    maxLines: 120,
  },
]

const IMPORT_RE = /\bimport\s+(?:[^'"\n]+\s+from\s+)?['"]([^'"]+)['"]/g
const EXPORT_RE = /\bexport\s+(?:[^'"\n]+\s+from\s+)?['"]([^'"]+)['"]/g

async function listFilesRecursively(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(entryPath)))
      continue
    }

    files.push(entryPath)
  }

  return files
}

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

async function resolveImport(fromFilePath, specifier) {
  if (!specifier.startsWith('.')) {
    return null
  }

  const basePath = path.resolve(path.dirname(fromFilePath), specifier)
  const candidates = []

  if (path.extname(basePath)) {
    candidates.push(basePath)
  } else {
    candidates.push(
      `${basePath}.ts`,
      `${basePath}.tsx`,
      `${basePath}.js`,
      `${basePath}.mjs`,
      path.join(basePath, 'index.ts'),
      path.join(basePath, 'index.tsx'),
      path.join(basePath, 'index.js'),
      path.join(basePath, 'index.mjs'),
    )
  }

  for (const candidate of candidates) {
    if (!(await fileExists(candidate))) {
      continue
    }

    if (!candidate.startsWith(SRC_DIR)) {
      return null
    }

    if (!candidate.endsWith('.ts') && !candidate.endsWith('.tsx')) {
      return null
    }

    return candidate
  }

  return null
}

function extractImportSpecifiers(fileContent) {
  const specifiers = []

  for (const regex of [IMPORT_RE, EXPORT_RE]) {
    regex.lastIndex = 0
    let match = regex.exec(fileContent)
    while (match) {
      const specifier = match[1]
      if (specifier) {
        specifiers.push(specifier)
      }
      match = regex.exec(fileContent)
    }
  }

  return specifiers
}

function canonicalizeCycle(cyclePaths) {
  const asPosix = cyclePaths.map((filePath) => toPosixRelative(filePath))
  if (asPosix.length === 0) {
    return ''
  }

  let best = null
  for (let index = 0; index < asPosix.length; index += 1) {
    const rotated = [...asPosix.slice(index), ...asPosix.slice(0, index)]
    const signature = rotated.join(' -> ')
    if (best === null || signature < best) {
      best = signature
    }
  }

  return best ?? ''
}

function detectCycles(adjacencyByFilePath) {
  const visitingStateByFilePath = new Map()
  const stack = []
  const cycles = new Map()

  function dfs(filePath) {
    visitingStateByFilePath.set(filePath, 'visiting')
    stack.push(filePath)

    const neighbors = adjacencyByFilePath.get(filePath) ?? []
    for (const neighbor of neighbors) {
      const state = visitingStateByFilePath.get(neighbor)
      if (state === 'visiting') {
        const startIndex = stack.indexOf(neighbor)
        const cycle = startIndex >= 0 ? stack.slice(startIndex) : [neighbor]
        const key = canonicalizeCycle(cycle)
        if (!cycles.has(key)) {
          cycles.set(key, cycle)
        }
        continue
      }

      if (state === 'visited') {
        continue
      }

      dfs(neighbor)
    }

    stack.pop()
    visitingStateByFilePath.set(filePath, 'visited')
  }

  for (const filePath of adjacencyByFilePath.keys()) {
    if (visitingStateByFilePath.get(filePath)) {
      continue
    }

    dfs(filePath)
  }

  return [...cycles.values()]
}

async function run() {
  const allFiles = await listFilesRecursively(SRC_DIR)
  const codeFiles = allFiles.filter((filePath) => filePath.endsWith('.ts') || filePath.endsWith('.tsx'))

  const fileSizeViolations = []
  for (const filePath of allFiles) {
    const fileContent = await fs.readFile(filePath, 'utf8')
    const lineCount = fileContent.split('\n').length

    for (const rule of FILE_SIZE_RULES) {
      if (!rule.include(filePath)) {
        continue
      }

      if (lineCount > rule.maxLines) {
        fileSizeViolations.push({
          rule: rule.name,
          filePath,
          lineCount,
          maxLines: rule.maxLines,
        })
      }
    }
  }

  const adjacencyByFilePath = new Map()
  const codeFileSet = new Set(codeFiles)

  for (const filePath of codeFiles) {
    const fileContent = await fs.readFile(filePath, 'utf8')
    const importSpecifiers = extractImportSpecifiers(fileContent)
    const neighbors = []

    for (const specifier of importSpecifiers) {
      const resolvedImport = await resolveImport(filePath, specifier)
      if (!resolvedImport || !codeFileSet.has(resolvedImport)) {
        continue
      }

      neighbors.push(resolvedImport)
    }

    adjacencyByFilePath.set(filePath, neighbors)
  }

  const cycles = detectCycles(adjacencyByFilePath)

  const hasFailures = fileSizeViolations.length > 0 || cycles.length > 0

  if (!hasFailures) {
    console.log('Maintainability checks passed.')
    return
  }

  if (fileSizeViolations.length > 0) {
    console.error('File size violations:')
    for (const violation of fileSizeViolations) {
      console.error(
        `- [${violation.rule}] ${toPosixRelative(violation.filePath)} has ${violation.lineCount} lines (max ${violation.maxLines})`,
      )
    }
  }

  if (cycles.length > 0) {
    console.error('Import cycle violations:')
    for (const cycle of cycles) {
      const cycleText = [...cycle, cycle[0]].map((filePath) => toPosixRelative(filePath)).join(' -> ')
      console.error(`- ${cycleText}`)
    }
  }

  process.exitCode = 1
}

run().catch((error) => {
  console.error('Maintainability check failed unexpectedly:', error)
  process.exitCode = 1
})
