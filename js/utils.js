export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function isWordChar(ch) {
  return /[\w']/.test(ch);
}

export function findVocabSpans(plain, word, key, tip) {
  const spans = [];
  const lowerPlain = plain.toLowerCase();
  const lowerWord = word.toLowerCase();
  const isPhrase = /\s/.test(word);
  let searchFrom = 0;

  while (searchFrom <= plain.length - word.length) {
    const idx = lowerPlain.indexOf(lowerWord, searchFrom);
    if (idx === -1) break;

    let start = idx;
    let end = idx + word.length;
    if (!isPhrase) {
      while (start > 0 && isWordChar(plain[start - 1])) start--;
      while (end < plain.length && isWordChar(plain[end])) end++;
    }

    spans.push({
      start,
      end,
      text: plain.slice(start, end),
      tip,
      key,
    });
    searchFrom = idx + word.length;
  }
  return spans;
}
