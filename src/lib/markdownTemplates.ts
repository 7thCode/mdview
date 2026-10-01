import { EditorSelection, type ChangeSpec, type EditorState, type TransactionSpec } from '@codemirror/state';

export type TemplateId =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'codeblock'
  | 'link'
  | 'image'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'quote'
  | 'hr'
  | 'table';

export const TEMPLATE_BUTTONS: { id: TemplateId; label: string; title: string }[] = [
  { id: 'heading1', label: 'H1', title: '見出し1' },
  { id: 'heading2', label: 'H2', title: '見出し2' },
  { id: 'heading3', label: 'H3', title: '見出し3' },
  { id: 'bold', label: 'B', title: '太字' },
  { id: 'italic', label: 'I', title: 'イタリック' },
  { id: 'strikethrough', label: 'S', title: '取り消し線' },
  { id: 'code', label: '`code`', title: 'インラインコード' },
  { id: 'codeblock', label: '{ }', title: 'コードブロック' },
  { id: 'link', label: 'Link', title: 'リンク' },
  { id: 'image', label: 'Img', title: '画像' },
  { id: 'bulletList', label: '•', title: '箇条書き' },
  { id: 'orderedList', label: '1.', title: '番号付きリスト' },
  { id: 'taskList', label: '☑', title: 'タスクリスト' },
  { id: 'quote', label: '"', title: '引用' },
  { id: 'hr', label: '―', title: '水平線' },
  { id: 'table', label: '▦', title: '表' }
];

// 行頭の見出し/リスト/引用マーカーをまとめて検出する。インデントは group 1、マーカー本体は group 2。
const BLOCK_MARKER_RE = /^(\s*)(#{1,6}\s+|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+|>\s?)/;

function wrapInline(state: EditorState, before: string, after: string, placeholder: string): TransactionSpec {
  return state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to);
    const content = text.length > 0 ? text : placeholder;
    const selFrom = range.from + before.length;
    const selTo = selFrom + content.length;
    return {
      changes: { from: range.from, to: range.to, insert: `${before}${content}${after}` },
      range: EditorSelection.range(selFrom, selTo)
    };
  });
}

function wrapCodeBlock(state: EditorState): TransactionSpec {
  return state.changeByRange((range) => {
    const content = state.sliceDoc(range.from, range.to);
    const selFrom = range.from + 4; // "```\n" の後
    const selTo = selFrom + content.length;
    return {
      changes: { from: range.from, to: range.to, insert: '```\n' + content + '\n```' },
      range: EditorSelection.range(selFrom, selTo)
    };
  });
}

function wrapLink(state: EditorState, isImage: boolean): TransactionSpec {
  const prefix = isImage ? '!' : '';
  const placeholder = isImage ? '代替テキスト' : 'リンクテキスト';
  return state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to);
    const hasSelection = text.length > 0;
    const label = hasSelection ? text : placeholder;
    const insert = `${prefix}[${label}](url)`;
    const labelFrom = range.from + prefix.length + 1;
    const urlFrom = range.from + prefix.length + label.length + 3;
    return {
      changes: { from: range.from, to: range.to, insert },
      // 選択ありならURL部分を、選択なしならラベル部分を次に編集できるよう選択する
      range: hasSelection
        ? EditorSelection.range(urlFrom, urlFrom + 3)
        : EditorSelection.range(labelFrom, labelFrom + label.length)
    };
  });
}

function toggleBlockMarker(state: EditorState, isSame: (marker: string) => boolean, marker: string): TransactionSpec {
  return state.changeByRange((range) => {
    const startLine = state.doc.lineAt(range.from);
    const endLine = state.doc.lineAt(range.to);
    const specs: ChangeSpec[] = [];
    for (let lineNo = startLine.number; lineNo <= endLine.number; lineNo++) {
      const line = state.doc.line(lineNo);
      const match = line.text.match(BLOCK_MARKER_RE);
      const indent = match ? match[1].length : 0;
      const existing = match ? match[2] : '';
      const from = line.from + indent;
      const to = from + existing.length;
      // 同じ種類のマーカーなら除去(トグルオフ)、それ以外は既存マーカーを置き換える
      specs.push({ from, to, insert: match && isSame(existing) ? '' : marker });
    }
    const changes = state.changes(specs);
    return { changes, range: range.map(changes) };
  });
}

// 水平線や表は独立した段落として存在する必要があるため、前後の空行を自動補完する。
// 補完しないと、直前のテキスト行に "---" が直結してセットext見出しの下線と誤認されるなどの問題が起きる。
function insertBlock(
  state: EditorState,
  build: (selectedText: string) => { body: string; select: (bodyStart: number) => { from: number; to: number } }
): TransactionSpec {
  return state.changeByRange((range) => {
    const { body, select } = build(state.sliceDoc(range.from, range.to));
    const before = state.sliceDoc(0, range.from);
    const after = state.sliceDoc(range.to);
    const leading = before.length === 0 || before.endsWith('\n\n') ? 0 : before.endsWith('\n') ? 1 : 2;
    const trailing = after.length === 0 || after.startsWith('\n\n') ? 0 : after.startsWith('\n') ? 1 : 2;
    const insert = '\n'.repeat(leading) + body + '\n'.repeat(trailing);
    const bodyStart = range.from + leading;
    const sel = select(bodyStart);
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(sel.from, sel.to)
    };
  });
}

// 選択テキストをCSV(カンマ区切り、1行目をヘッダー扱い)とみなしてMarkdownの表に変換する。
// セル内の "|" はテーブル構文を壊さないようエスケープし、行ごとの列数の差は空セルで埋める。
function csvToMarkdownTable(text: string): string {
  const rows = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/\|/g, '\\|')));
  const columns = Math.max(1, ...rows.map((row) => row.length));
  const pad = (row: string[]) => Array.from({ length: columns }, (_, i) => row[i] ?? '');
  const [header, ...dataRows] = rows.map(pad);
  const toLine = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [toLine(header), toLine(Array(columns).fill('---')), ...dataRows.map(toLine)].join('\n');
}

function insertTable(state: EditorState): TransactionSpec {
  return insertBlock(state, (text) => {
    if (text.trim().length === 0) {
      const header = '見出し1';
      return {
        body: `| ${header} | 見出し2 |\n| --- | --- |\n| セル | セル |`,
        select: (bodyStart) => ({ from: bodyStart + 2, to: bodyStart + 2 + header.length })
      };
    }
    // CSVとして表に変換した場合、プレースホルダーが無いのでカーソルは末尾に置く
    const body = csvToMarkdownTable(text);
    return { body, select: (bodyStart) => ({ from: bodyStart + body.length, to: bodyStart + body.length }) };
  });
}

export function buildTemplateTransaction(state: EditorState, id: TemplateId): TransactionSpec {
  switch (id) {
    case 'heading1':
      return toggleBlockMarker(state, (m) => /^#{1}\s+$/.test(m), '# ');
    case 'heading2':
      return toggleBlockMarker(state, (m) => /^#{2}\s+$/.test(m), '## ');
    case 'heading3':
      return toggleBlockMarker(state, (m) => /^#{3}\s+$/.test(m), '### ');
    case 'bold':
      return wrapInline(state, '**', '**', '太字');
    case 'italic':
      return wrapInline(state, '*', '*', 'イタリック');
    case 'strikethrough':
      return wrapInline(state, '~~', '~~', '取り消し線');
    case 'code':
      return wrapInline(state, '`', '`', 'コード');
    case 'codeblock':
      return wrapCodeBlock(state);
    case 'link':
      return wrapLink(state, false);
    case 'image':
      return wrapLink(state, true);
    case 'bulletList':
      return toggleBlockMarker(state, (m) => /^[-*+]\s+$/.test(m), '- ');
    case 'orderedList':
      return toggleBlockMarker(state, (m) => /^\d+\.\s+$/.test(m), '1. ');
    case 'taskList':
      return toggleBlockMarker(state, (m) => /^[-*+]\s+\[[ xX]\]\s+$/.test(m), '- [ ] ');
    case 'quote':
      return toggleBlockMarker(state, (m) => /^>\s?$/.test(m), '> ');
    case 'hr':
      return insertBlock(state, () => ({
        body: '---',
        select: (bodyStart) => ({ from: bodyStart + 3, to: bodyStart + 3 })
      }));
    case 'table':
      return insertTable(state);
  }
}
