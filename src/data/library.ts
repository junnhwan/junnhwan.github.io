import manifest from './library.json';

export interface LearningDocument {
  slug: string;
  title: string;
  description: string;
  topic: string;
  tags: string[];
  updatedAt: string;
  /** Path to the original HTML, relative to public/library/<slug>/. */
  entry: string;
}

const documents: LearningDocument[] = manifest;
const seen = new Set<string>();

for (const doc of documents) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.slug) || seen.has(doc.slug)) {
    throw new Error(`资料库 slug 无效或重复：${doc.slug}`);
  }
  if (
    !doc.title?.trim() || !doc.description?.trim() || !doc.topic?.trim() ||
    !Array.isArray(doc.tags) || doc.tags.some((tag) => typeof tag !== 'string') ||
    !/^\d{4}-\d{2}-\d{2}$/.test(doc.updatedAt) ||
    !doc.entry || doc.entry.includes('\\') ||
    doc.entry.split('/').some((part) => !part || part === '.' || part === '..') ||
    !/\.html?$/i.test(doc.entry) || /[?#:\u0000-\u001f]/.test(doc.entry)
  ) {
    throw new Error(`资料库元信息不完整：${doc.slug}`);
  }
  seen.add(doc.slug);
}

export const learningDocuments = [...documents].sort((a, b) =>
  b.updatedAt.localeCompare(a.updatedAt)
);

export const documentHref = (doc: LearningDocument) =>
  `/library/${doc.slug}/${doc.entry.split('/').map(encodeURIComponent).join('/')}`;
