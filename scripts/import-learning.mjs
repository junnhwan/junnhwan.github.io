#!/usr/bin/env node
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants } from 'node:fs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const outputRoot = path.join(repoRoot, 'public', 'library');
const manifestPath = path.join(repoRoot, 'src', 'data', 'library.json');
const help = `用法：
  node scripts/import-learning.mjs --source <HTML 文件或目录> --slug <英文短名>
    --title <标题> --description <简介> --topic <主题>
    [--tags <逗号分隔的标签>] [--updated <YYYY-MM-DD>] [--entry <入口 HTML>]
    [--include <相对文件、目录或文件名通配符>] [--all] [--dry-run]

单文件默认只复制该 HTML；依赖文件用 --include 指定（可以重复）。
目录必须明确使用 --include 或 --all。--include '*.html' 可选中该目录的 HTML。
--all 适合仅包含公开静态资料的专用目录，自动跳过 .git 和 node_modules。
目录的默认入口为 index.html，单文件的默认入口为原文件名。
--dry-run 检查并列出计划，不复制文件，不修改目录。
已有 slug 或目标目录不会被覆盖。具体示例见 docs/library.md。`;

function parseArgs(args) {
  const values = {};
  const include = [];
  const flags = new Set(['help', 'all', 'dry-run']);
  const fields = new Set(['source', 'slug', 'title', 'description', 'topic', 'tags', 'updated', 'entry', 'include']);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) throw new Error(`无法识别的参数：${arg}`);
    const name = arg.slice(2);
    if (flags.has(name)) {
      if (values[name]) throw new Error(`参数重复：${arg}`);
      values[name] = true;
      continue;
    }
    if (!fields.has(name)) throw new Error(`无法识别的参数：${arg}`);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`参数缺少值：${arg}`);
    if (name === 'include') include.push(value);
    else {
      if (values[name] !== undefined) throw new Error(`参数重复：${arg}`);
      values[name] = value.trim();
    }
  }
  return { ...values, include };
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function relativePath(value, label) {
  const normalized = value.replaceAll('\\', '/');
  if (
    !normalized || path.posix.isAbsolute(normalized) ||
    normalized.split('/').some((part) => !part || part === '.' || part === '..') ||
    /[\u0000-\u001f:?#]/.test(normalized)
  ) throw new Error(`${label} 必须是资料目录内的相对路径：${value}`);
  return normalized;
}

async function statIfExists(target) {
  try { return await fs.lstat(target); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function rejectSymlinkAncestors(target) {
  let current = path.resolve(target);
  while (true) {
    const stat = await statIfExists(current);
    if (stat?.isSymbolicLink()) throw new Error(`不支持符号链接或目录联接：${current}`);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function shanghaiToday() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((key) => parts.find((part) => part.type === key).value).join('-');
}

async function readManifest() {
  await rejectSymlinkAncestors(manifestPath);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (!Array.isArray(manifest)) throw new Error('src/data/library.json 必须是数组。');
  const slugs = new Set();
  for (const doc of manifest) {
    if (
      !doc || typeof doc !== 'object' ||
      typeof doc.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.slug) ||
      slugs.has(doc.slug) ||
      ['title', 'description', 'topic'].some((key) => typeof doc[key] !== 'string' || !doc[key].trim()) ||
      !Array.isArray(doc.tags) || doc.tags.some((tag) => typeof tag !== 'string') ||
      typeof doc.updatedAt !== 'string' || !validDate(doc.updatedAt) ||
      typeof doc.entry !== 'string' || !/\.html?$/i.test(doc.entry)
    ) throw new Error('资料清单存在无效或重复记录，请先修复 src/data/library.json。');
    relativePath(doc.entry, '现有入口');
    slugs.add(doc.slug);
  }
  return manifest;
}

async function collectFiles(sourceRoot, selections, all) {
  const files = new Map();
  async function visit(relative) {
    const absolute = path.resolve(sourceRoot, relative);
    if (!inside(sourceRoot, absolute)) throw new Error(`来源路径超出资料目录：${relative}`);
    await rejectSymlinkAncestors(absolute);
    const stat = await fs.lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error(`不支持符号链接：${relative}`);
    if (stat.isDirectory()) {
      const names = (await fs.readdir(absolute)).sort();
      for (const name of names) {
        if (name === '.git' || name === 'node_modules') continue;
        await visit(relative ? `${relative}/${name}` : name);
      }
    } else if (stat.isFile()) {
      const canonical = await fs.realpath(absolute);
      if (!inside(sourceRoot, canonical)) throw new Error(`来源路径超出资料目录：${relative}`);
      const key = relative.toLocaleLowerCase();
      const existing = files.get(key);
      if (existing && existing.relative !== relative) throw new Error(`文件名仅大小写不同，无法可靠发布：${relative}`);
      files.set(key, { relative, absolute, size: stat.size });
    } else throw new Error(`只支持普通文件与目录：${relative}`);
  }

  if (all) await visit('');
  else for (const selection of selections) {
    const relative = relativePath(selection, '--include');
    if (!relative.includes('*')) {
      await visit(relative);
      continue;
    }
    const parent = path.posix.dirname(relative);
    const basename = path.posix.basename(relative);
    if (parent.includes('*') || basename.includes('**')) throw new Error('通配符仅支持文件名中的 *，请把目录单独作为 --include。');
    const directory = path.resolve(sourceRoot, parent);
    await rejectSymlinkAncestors(directory);
    const pattern = new RegExp(`^${basename.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'i');
    const matches = (await fs.readdir(directory)).filter((name) => pattern.test(name)).sort();
    if (!matches.length) throw new Error(`没有文件匹配：${relative}`);
    for (const name of matches) await visit(parent === '.' ? name : `${parent}/${name}`);
  }
  return [...files.values()].sort((a, b) => a.relative.localeCompare(b.relative));
}

function cssReferences(css) {
  const references = [];
  // Ignore comments and ordinary strings, such as content: "url(example)".
  // A URL function or @import is only interpreted within actual CSS.
  const tokens = /\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\burl\s*\(\s*(?:"(?<urlDouble>(?:\\[\s\S]|[^"\\])*)"|'(?<urlSingle>(?:\\[\s\S]|[^'\\])*)'|(?<urlBare>[^)]*?))\s*\)|@import\s+(?:"(?<importDouble>(?:\\[\s\S]|[^"\\])*)"|'(?<importSingle>(?:\\[\s\S]|[^'\\])*)')/gi;
  for (const match of css.matchAll(tokens)) {
    const groups = match.groups;
    const reference = groups?.urlDouble ?? groups?.urlSingle ?? groups?.urlBare ?? groups?.importDouble ?? groups?.importSingle;
    if (reference !== undefined) references.push(reference);
  }
  return references;
}

function htmlReferences(content) {
  const references = [];
  const attributes = (tag) => {
    const values = new Map();
    const source = tag.replace(/^<[a-z][a-z\d:-]*/i, '');
    for (const match of source.matchAll(/([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`=]+))/g)) {
      values.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4]);
    }
    return values;
  };
  // Keep the opening script tag (and its src), but never parse JavaScript as
  // HTML/CSS. Title/textarea are also raw text, including literal code examples.
  const tagPattern = '<[a-z][a-z\\d:-]*(?:"[^"]*"|\'[^\']*\'|[^\'">])*>';
  const rawText = /(<(script|title|textarea)\b(?:"[^"]*"|'[^']*'|[^'">])*>)[\s\S]*?<\/\2\s*>/gi;
  let markup = content.replace(/<!--[\s\S]*?-->/g, '').replace(rawText, '$1');
  markup = markup.replace(/(<style\b(?:"[^"]*"|'[^']*'|[^'">])*>)([\s\S]*?)<\/style\s*>/gi, (_, opening, css) => {
    references.push(...cssReferences(css));
    return opening;
  });
  for (const match of markup.matchAll(new RegExp(tagPattern, 'gi'))) {
    const values = attributes(match[0]);
    for (const name of ['href', 'src', 'poster']) {
      if (values.has(name)) references.push(values.get(name));
    }
    const refresh = values.get('content');
    if (/^<meta\b/i.test(match[0]) && refresh) {
      const target = /\burl\s*=\s*(.+)/i.exec(refresh);
      if (target) references.push(target[1].replace(/^["']|["']$/g, ''));
    }
    if (values.has('style')) {
      const css = values.get('style').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&');
      references.push(...cssReferences(css));
    }
  }
  return references;
}

async function checkReferences(files) {
  const included = new Set(files.map((file) => file.relative));
  for (const file of files) {
    if (!/\.(html?|css)$/i.test(file.relative)) continue;
    const content = await fs.readFile(file.absolute, 'utf8');
    const references = [];
    // Injected HTML fragments resolve relative links against their host page.
    // Only standalone documents have their own reliable reference base here.
    if (/\.html?$/i.test(file.relative) && /(?:<!doctype\s+html\b|<html(?:\s|>))/i.test(content)) {
      references.push(...htmlReferences(content));
    }
    if (/\.css$/i.test(file.relative)) {
      references.push(...cssReferences(content));
    }
    for (const raw of references) {
      const reference = raw.trim().replaceAll('&amp;', '&');
      if (!reference || reference.startsWith('#')) continue;
      if (/^(?:file:|[a-z]:[\\/])/i.test(reference)) throw new Error(`${file.relative} 仍引用本机路径：${reference}`);
      if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(reference)) continue;
      // Template values and JavaScript-generated paths require a manual browser check.
      if (/[{}<>]/.test(reference)) continue;
      let decoded;
      try { decoded = decodeURIComponent(reference.split(/[?#]/)[0]); }
      catch { throw new Error(`${file.relative} 中的引用无法解析：${reference}`); }
      if (!decoded) continue;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file.relative), decoded));
      if (resolved === '..' || resolved.startsWith('../')) throw new Error(`${file.relative} 引用了资料目录外的文件：${reference}`);
      const possible = [resolved, `${resolved}/index.html`, `${resolved}/index.htm`];
      if (!possible.some((candidate) => included.has(candidate))) {
        throw new Error(`${file.relative} 的依赖未选中：${reference}。请增加 --include 或修正链接。`);
      }
    }
  }
}

async function cleanOwnedDirectory(target) {
  if (!inside(outputRoot, target) || path.resolve(target) === path.resolve(outputRoot)) {
    throw new Error('清理目标超出资料库目录，停止清理。');
  }
  await rejectSymlinkAncestors(target);
  await fs.rm(target, { recursive: true, force: true });
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(help); return; }
  for (const name of ['source', 'slug', 'title', 'description', 'topic']) {
    if (!args[name]) throw new Error(`缺少 --${name}。运行 --help 查看用法。`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.slug)) throw new Error('--slug 使用小写英文、数字和连字符，例如 k8sgpt-learning。');
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(args.slug)) throw new Error('--slug 不能使用 Windows 保留的设备名称。');
  if (args.slug === 'index') throw new Error('--slug 不能使用 index，以免与资料库首页冲突。');
  if (args.all && args.include.length) throw new Error('--all 与 --include 请选择其中一种。');
  const updatedAt = args.updated || shanghaiToday();
  if (!validDate(updatedAt)) throw new Error('--updated 使用有效日期 YYYY-MM-DD。');

  const source = path.resolve(args.source);
  await rejectSymlinkAncestors(source);
  const sourceStat = await fs.lstat(source);
  if (!sourceStat.isFile() && !sourceStat.isDirectory()) throw new Error('--source 只支持普通 HTML 文件或目录。');
  const isFile = sourceStat.isFile();
  if (isFile && !/\.html?$/i.test(source)) throw new Error('单文件导入仅支持 HTML。');
  if (isFile && args.all) throw new Error('--all 仅用于目录。单文件的依赖请用 --include 指定。');
  if (!isFile && !args.all && !args.include.length) throw new Error('目录导入需要 --include 明确选择资料，或 --all 复制专用静态资料目录。');
  const sourceRoot = await fs.realpath(isFile ? path.dirname(source) : source);
  const entry = relativePath(args.entry || (isFile ? path.basename(source) : 'index.html'), '--entry');
  if (!/\.html?$/i.test(entry)) throw new Error('--entry 必须为 HTML 文件。');
  const target = path.resolve(outputRoot, args.slug);
  if (!inside(outputRoot, target) || target === outputRoot) throw new Error('目标路径无效。');
  if (!isFile && inside(sourceRoot, target)) throw new Error('来源目录包含目标目录，请选取独立的静态资料目录。');
  await rejectSymlinkAncestors(outputRoot);
  if (await statIfExists(target)) throw new Error(`目标目录已经存在，不会覆盖：${target}`);
  const initialManifest = await readManifest();
  if (initialManifest.some((doc) => doc.slug === args.slug)) throw new Error(`资料清单中已存在 ${args.slug}，不会覆盖。`);
  const selections = isFile ? [path.basename(source), ...args.include] : args.include;
  const files = await collectFiles(sourceRoot, selections, args.all);
  if (!files.some((file) => file.relative === entry)) throw new Error(`入口 ${entry} 未选中，请增加 --include 或指定 --entry。`);
  await checkReferences(files);

  const doc = {
    slug: args.slug,
    title: args.title,
    description: args.description,
    topic: args.topic,
    tags: [...new Set((args.tags || '').split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))],
    updatedAt,
    entry,
  };
  console.log(`${args['dry-run'] ? '检查通过，计划导入' : '准备导入'}：${doc.title}`);
  console.log(`入口：/library/${doc.slug}/${entry.split('/').map(encodeURIComponent).join('/')}`);
  console.log(`文件：${files.length} 个，共 ${(files.reduce((sum, file) => sum + file.size, 0) / 1024).toFixed(1)} KiB`);
  for (const file of files) console.log(`  ${file.relative}`);
  if (args['dry-run']) return;

  const lockPath = path.join(path.dirname(manifestPath), '.library-import.lock');
  let lock;
  try { lock = await fs.open(lockPath, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('另一次导入尚未结束（.library-import.lock 存在），请稍后重试。');
    throw error;
  }
  let ownsTarget = false;
  let temporaryManifest;
  try {
    const manifest = await readManifest();
    if (manifest.some((item) => item.slug === doc.slug)) throw new Error(`资料清单中已存在 ${doc.slug}，不会覆盖。`);
    await rejectSymlinkAncestors(outputRoot);
    await fs.mkdir(outputRoot, { recursive: true });
    await fs.mkdir(target); // Exclusive creation: never merge into an existing directory.
    ownsTarget = true;
    for (const file of files) {
      const destination = path.resolve(target, file.relative);
      if (!inside(target, destination)) throw new Error(`文件目标路径无效：${file.relative}`);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await rejectSymlinkAncestors(file.absolute);
      await fs.copyFile(file.absolute, destination, constants.COPYFILE_EXCL);
    }
    const temporary = await fs.mkdtemp(path.join(path.dirname(manifestPath), '.library-manifest-'));
    temporaryManifest = temporary;
    const nextManifest = path.join(temporary, 'library.json');
    await fs.writeFile(nextManifest, `${JSON.stringify([...manifest, doc], null, 2)}\n`, { flag: 'wx' });
    await fs.rename(nextManifest, manifestPath);
    ownsTarget = false;
    console.log('已收录。原文件保持不变；运行 npm run build 后检查资料库与文档页面。');
  } catch (error) {
    if (ownsTarget) await cleanOwnedDirectory(target);
    throw error;
  } finally {
    if (temporaryManifest) {
      const metadataRoot = path.dirname(manifestPath);
      if (!inside(metadataRoot, temporaryManifest) || temporaryManifest === metadataRoot) throw new Error('临时清单路径无效。');
      await rejectSymlinkAncestors(temporaryManifest);
      await fs.rm(temporaryManifest, { recursive: true, force: true });
    }
    await lock.close();
    await fs.unlink(lockPath);
  }
}

run().catch((error) => {
  console.error(`导入失败：${error.message}`);
  process.exitCode = 1;
});
