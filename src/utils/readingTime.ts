export function calculateReadingTime(content: string): string {
  const wordsPerMinute = 300;
  // Remove markdown formatting and whitespace
  const cleanContent = content
    .replace(/[#*`~_\[\]()]/g, '')
    .replace(/\s+/g, '');
  const wordCount = cleanContent.length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date).replace(/\//g, '-');
}
