// Shared converter: plain text <-> Unicode "Mathematical Alphanumeric Symbols".
// Loaded by the content script and by the popup.
(function (root) {
  const cp = (n) => String.fromCodePoint(n);

  function build(upperStart, lowerStart, digitStart, overrides) {
    const m = {};
    for (let i = 0; i < 26; i++) {
      m[String.fromCharCode(65 + i)] = cp(upperStart + i);
      m[String.fromCharCode(97 + i)] = cp(lowerStart + i);
    }
    if (digitStart) {
      for (let i = 0; i < 10; i++) m[String.fromCharCode(48 + i)] = cp(digitStart + i);
    }
    return Object.assign(m, overrides || {});
  }

  const MAPS = {
    // Bold has letters and digits.
    bold: build(0x1D400, 0x1D41A, 0x1D7CE),
    // Italic has no digits, and its "h" lives in a different block.
    italic: build(0x1D434, 0x1D44E, null, { h: 'ℎ' }),
    // Bold italic has no digits of its own, so digits fall back to bold.
    boldItalic: build(0x1D468, 0x1D482, 0x1D7CE),
    // Monospace has letters and digits.
    mono: build(0x1D670, 0x1D68A, 0x1D7F6)
  };

  // Reverse map, used to turn styled text back into normal text.
  const REVERSE = {};
  Object.keys(MAPS).forEach((style) => {
    Object.keys(MAPS[style]).forEach((plain) => {
      REVERSE[MAPS[style][plain]] = plain;
    });
  });

  // Underline and strikethrough use combining marks that follow each letter.
  const MARKS = { underline: '\u0332', strike: '\u0336' };
  const ALL_MARKS = /[\u0332\u0336]/g;

  function addMark(text, mark) {
    // Split into base characters with their trailing marks, then rebuild in a fixed order.
    const chars = Array.from(text);
    const out = [];
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch === MARKS.underline || ch === MARKS.strike) { out.push(ch); continue; } // stray mark
      let u = false, st = false, j = i + 1;
      while (chars[j] === MARKS.underline || chars[j] === MARKS.strike) {
        if (chars[j] === MARKS.underline) u = true; else st = true;
        j++;
      }
      const skip = /\s/.test(ch);
      if (!skip) { if (mark === MARKS.underline) u = true; else st = true; }
      out.push(ch);
      if (u) out.push(MARKS.underline);
      if (st) out.push(MARKS.strike);
      i = j - 1;
    }
    return out.join('');
  }


  // ---------- Lists ----------
  // A list style is written as "list:<marker>", for example "list:•" or "list:1.".
  // "list:none" takes list markers off again.
  const MARKER_RE = /^\s*(?:[•◦▪▫●○■□◆◇▸▶➤➔→✔✓✅☑★☆✦✧❖※–]|[-*]|\d{1,3}[.)]|[①-⑩❶-❿])\s+/;

  function parseList(style) {
    if (typeof style !== 'string' || style.indexOf('list:') !== 0) return null;
    const marker = style.slice(5);
    if (marker === 'none') return { kind: 'remove', marker: '' };
    if (/^1[.)]$/.test(marker)) return { kind: 'numbered', marker };
    return marker ? { kind: 'bullet', marker } : null;
  }

  // lines: array of strings, one per paragraph. Pressing the same list style again removes it.
  function listLines(lines, spec) {
    const filled = lines.filter((l) => l.trim());
    const sameMarker = (l) => spec.kind === 'numbered'
      ? new RegExp('^\\s*\\d{1,3}\\' + spec.marker.slice(-1) + '\\s').test(l)
      : l.trimStart().indexOf(spec.marker + ' ') === 0;
    const remove = spec.kind === 'remove' || (filled.length > 0 && filled.every(sameMarker));
    let n = 0;
    return lines.map((l) => {
      if (!l.trim()) return l;
      const body = l.replace(MARKER_RE, '');
      if (remove) return body;
      n++;
      return (spec.kind === 'numbered' ? n + spec.marker.slice(-1) : spec.marker) + ' ' + body;
    });
  }

  // Decides what a style button should do. Pressing bold on text that is already
  // fully bold turns it back to normal, and the same for the other styles.
  function resolve(text, style) {
    if (MARKS[style]) {
      const mark = MARKS[style];
      const chars = Array.from(text);
      let marked = 0, bare = 0;
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if (/\s/.test(ch) || ch === MARKS.underline || ch === MARKS.strike) continue;
        if (chars[i + 1] === mark || (chars[i + 1] && /[\u0332\u0336]/.test(chars[i + 1]) && chars.slice(i + 1, i + 3).includes(mark))) marked++;
        else bare++;
      }
      return marked > 0 && bare === 0 ? (style === 'underline' ? 'removeUnderline' : 'removeStrike') : style;
    }
    const map = MAPS[style];
    if (!map) return style;
    const styled = new Set(Object.values(map));
    let hit = 0, other = 0;
    Array.from(text.replace(ALL_MARKS, '')).forEach((ch) => {
      if (styled.has(ch)) hit++;
      else if ((map[ch] !== undefined && map[ch] !== ch) || REVERSE[ch] !== undefined) other++; // plain or other style
    });
    return hit > 0 && other === 0 ? 'unstyle' : style;
  }

  function convert(text, style) {
    if (style === 'unstyle') return Array.from(text).map((ch) => REVERSE[ch] || ch).join('');
    if (style === 'removeUnderline') return text.replace(/\u0332/g, '');
    if (style === 'removeStrike') return text.replace(/\u0336/g, '');
    if (style === 'plain') {
      return Array.from(text.replace(ALL_MARKS, '')).map((ch) => REVERSE[ch] || ch).join('');
    }
    if (MARKS[style]) return addMark(text, MARKS[style]);
    const map = MAPS[style];
    if (!map) return text;
    // Normalise first, so converting already styled text never double-converts.
    return Array.from(text)
      .map((ch) => map[REVERSE[ch] || ch] || REVERSE[ch] || ch)
      .join('');
  }

  root.LBT = { convert, resolve, parseList, listLines, MAPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.LBT;
})(typeof self !== 'undefined' ? self : this);
