#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

// --- resolve "src" root robustly ---
function findSrcRoot(cliRoot) {
  const cwd = process.cwd()
  const tryDir = (d) => fs.existsSync(path.join(d, 'src')) ? path.join(d, 'src')
                      : (path.basename(d) === 'src' && fs.existsSync(d)) ? d
                      : null

  if (cliRoot) {
    const abs = path.isAbsolute(cliRoot) ? cliRoot : path.resolve(cwd, cliRoot)
    const hit = tryDir(abs) || (fs.existsSync(abs) ? abs : null)
    if (!hit) throw new Error(`--root ${cliRoot} does not contain a "src"`)
    return hit
  }

  // 1) If CWD has src/
  const direct = tryDir(cwd)
  if (direct) return direct

  // 2) Climb up a few levels to find a folder that has src/
  let dir = cwd
  for (let i = 0; i < 6; i++) {
    const parent = path.dirname(dir)
    if (parent === dir) break
    const hit = tryDir(parent)
    if (hit) return hit
    dir = parent
  }

  throw new Error(`Could not find a "src" folder from ${cwd}`)
}

const argRootIdx = process.argv.indexOf('--root')
const root = findSrcRoot(argRootIdx > -1 ? process.argv[argRootIdx + 1] : undefined)

// --- utils ---
function resolveLocal(spec, fromFile) {
  let p = spec
  if (spec.startsWith('@/')) {
    p = path.join(root, spec.slice(2))
  } else if (spec.startsWith('./') || spec.startsWith('../')) {
    p = path.resolve(path.dirname(fromFile), spec)
  } else {
    return null // bare package
  }
  const candidates = [
    p,
    `${p}.ts`,
    `${p}.tsx`,
    path.join(p, 'index.ts'),
    path.join(p, 'index.tsx'),
  ]
  for (const c of candidates) if (fs.existsSync(c)) return c
  return null
}

function read(file) { try { return fs.readFileSync(file, 'utf8') } catch { return '' } }

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p)
  }
  return out
}

// --- scan ---
const files = walk(root)
const importRe = /import\s+([^'"]+)\s+from\s+['"]([^'"]+)['"];?/g
const missingFiles = []
const missingExports = []

for (const file of files) {
  const src = read(file)
  importRe.lastIndex = 0
  let m
  while ((m = importRe.exec(src))) {
    const imports = m[1].trim()
    const spec = m[2].trim()
    const target = resolveLocal(spec, file)
    if (!target) continue

    if (!fs.existsSync(target)) {
      missingFiles.push({
        from: path.relative(root, file),
        spec,
        resolved: path.relative(root, target),
      })
      continue
    }

    // Named imports → check if exported
    const named = []
    const namedMatch = imports.match(/\{([^}]+)\}/)
    if (namedMatch) {
      for (const part of namedMatch[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0].trim()
        if (name) named.push(name)
      }
    }
    if (named.length) {
      const tgtSrc = read(target)
      for (const n of named) {
        const regexes = [
          new RegExp(`export\\s+(?:async\\s+)?function\\s+${n}\\b`),
          new RegExp(`export\\s+const\\s+${n}\\b`),
          new RegExp(`export\\s+class\\s+${n}\\b`),
          new RegExp(`export\\s*\\{[^}]*\\b${n}\\b[^}]*\\}`),
        ]
        const ok = regexes.some(r => r.test(tgtSrc))
        if (!ok) {
          missingExports.push({
            from: path.relative(root, file),
            spec: path.relative(root, target),
            name: n,
          })
        }
      }
    }
  }
}

// --- print ---
function header(t){ console.log('\n' + t + '\n' + '-'.repeat(t.length)) }
console.log(`Scanning src root: ${root}`)

header('Missing LOCAL FILES (imports that did not resolve)')
if (missingFiles.length === 0) console.log('None ✅')
else missingFiles.forEach(x => console.log(`${x.from}: "${x.spec}" → ${x.resolved}`))

header('Missing NAMED EXPORTS (imported but not found in target)')
if (missingExports.length === 0) console.log('None ✅')
else missingExports.forEach(x => console.log(`${x.from}: ${x.name} not exported by ${x.spec}`))

header('All .ts/.tsx files under src/')
files.sort().forEach(f => console.log(path.relative(process.cwd(), f)))
