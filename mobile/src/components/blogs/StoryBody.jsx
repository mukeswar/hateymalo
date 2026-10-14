import React from 'react';
import { View } from 'react-native';
import { colors, fonts } from '../../theme';
import { T } from '../ui';

// The website renders blog content as plain text with `whitespace-pre-line`.
// Stories may still contain simple HTML or markdown-ish markup, so it is turned
// into native blocks: headings (#, ##, <h1-6>), bullets (-, *, •, <li>) and
// paragraphs separated by blank lines. Single line breaks are kept.

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const toText = (content = '') =>
  decode(
    String(content)
      .replace(/\r\n/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<h([1-6])[^>]*>/gi, (_, n) => `\n\n${'#'.repeat(Number(n) > 2 ? 3 : Number(n))} `)
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<\/(p|div|ul|ol|blockquote)>/gi, '\n\n')
      .replace(/<[^>]+>/g, ''),
  );

const parse = (content) => {
  const blocks = [];
  toText(content)
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .forEach((chunk) => {
      const lines = chunk.split('\n');
      let para = [];
      const flush = () => {
        if (para.length) blocks.push({ type: 'p', text: para.join('\n').trim() });
        para = [];
      };
      lines.forEach((raw) => {
        const line = raw.trim();
        const h = /^(#{1,6})\s+(.*)$/.exec(line);
        const li = /^([-*•]|\d+[.)])\s+(.*)$/.exec(line);
        if (h) {
          flush();
          blocks.push({ type: h[1].length <= 2 ? 'h2' : 'h3', text: h[2] });
        } else if (li) {
          flush();
          blocks.push({ type: 'li', text: li[2] });
        } else if (line) {
          para.push(line);
        }
      });
      flush();
    });
  return blocks;
};

const stripInline = (s) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1');

export const StoryBody = ({ content }) => {
  const blocks = parse(content);
  return (
    <View style={{ gap: 16 }}>
      {blocks.map((b, i) => {
        const text = stripInline(b.text);
        if (b.type === 'h2') return <T key={i} variant="h1" style={{ marginTop: 8 }}>{text}</T>;
        if (b.type === 'h3') return <T key={i} variant="h2" style={{ marginTop: 4 }}>{text}</T>;
        if (b.type === 'li')
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginTop: -6 }}>
              <T style={{ fontFamily: fonts.bold, fontSize: 18, lineHeight: 30, color: colors.brand }}>•</T>
              <T style={[styles.body, { flex: 1 }]}>{text}</T>
            </View>
          );
        // Only for Latin letters: splitting Devanagari would detach combining vowel signs.
        if (i === 0 && text.length > 1 && /^[A-Za-z]/.test(text)) {
          // Drop-cap feel from the website: the first letter in the brand display face.
          return (
            <T key={i} style={styles.body}>
              <T style={styles.dropCap}>{text[0]}</T>
              {text.slice(1)}
            </T>
          );
        }
        return <T key={i} style={styles.body}>{text}</T>;
      })}
    </View>
  );
};

const styles = {
  body: { fontFamily: fonts.body, fontSize: 18, lineHeight: 30, color: colors.inkSoft },
  dropCap: { fontFamily: fonts.displayBold, fontSize: 30, color: colors.brand },
};

export default StoryBody;
