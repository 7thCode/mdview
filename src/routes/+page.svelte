<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { getCurrentWebview } from '@tauri-apps/api/webview';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import Editor from '$lib/Editor.svelte';
  import MarkdownToolbar from '$lib/MarkdownToolbar.svelte';
  import Preview from '$lib/Preview.svelte';
  import { renderMarkdown } from '$lib/markdown';
  import { doc } from '$lib/document.svelte';
  import '../app.css';

  let editor: Editor;
  let dragging = $state(false);

  const appWindow = getCurrentWindow();

  $effect(() => {
    void appWindow.setTitle(`${doc.dirty ? '● ' : ''}${doc.name} — MDView`);
  });

  function inTextField(): boolean {
    const active = document.activeElement;
    return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
  }

  function showEditor(action: () => void) {
    if (doc.mode !== 'edit') doc.mode = 'edit';
    // 表示切替の反映を待ってから実行する
    queueMicrotask(action);
  }

  // WKWebView 標準の印刷は両面指定が効かず先頭に空白ページが入るため、
  // 描画結果を単体の HTML として書き出し、既定のブラウザの印刷機能に渡す
  async function printDocument() {
    const css = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules, (rule) => rule.cssText))
      .join('\n');
    const dir = doc.path?.replace(/[\\/][^\\/]*$/, '').replaceAll('\\', '/');
    const base = dir ? `<base href="file://${encodeURI(dir.startsWith('/') ? dir : `/${dir}`)}/" />` : '';
    const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(doc.name)}</title>
${base}
<style>${css}</style>
</head>
<body>
<article class="preview markdown-body">${renderMarkdown(doc.content)}</article>
<script>addEventListener('load', () => setTimeout(() => print(), 300));<\/script>
</body>
</html>`;
    await invoke('print_html', { html });
  }

  function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  }

  async function handleMenu(id: string) {
    if (id.startsWith('recent:')) return doc.openPath(id.slice('recent:'.length));
    switch (id) {
      case 'new': return doc.newDocument();
      case 'open': return doc.openDialog();
      case 'save': return void (await doc.save());
      case 'save-as': return void (await doc.saveAs());
      case 'print': return printDocument();
      case 'toggle-mode': return doc.toggleMode();
      case 'find':
      case 'replace': return showEditor(() => editor.commands.find());
      // 検索欄の入力中は、文書ではなく入力欄側の Undo/Redo を使う
      case 'undo': return inTextField() ? void document.execCommand('undo') : editor.commands.undo();
      case 'redo': return inTextField() ? void document.execCommand('redo') : editor.commands.redo();
      case 'quit': return void (await appWindow.close());
    }
  }

  onMount(() => {
    const cleanups: Array<() => void> = [];
    const track = (pending: Promise<() => void>) => void pending.then((off) => cleanups.push(off));

    track(listen<string>('menu', (event) => void handleMenu(event.payload)));

    track(
      appWindow.onCloseRequested(async (event) => {
        event.preventDefault();
        if (await doc.confirmDiscard()) await appWindow.destroy();
      })
    );

    track(
      getCurrentWebview().onDragDropEvent((event) => {
        const { type } = event.payload;
        dragging = type === 'enter' || type === 'over';
        if (type === 'drop' && event.payload.paths.length > 0) {
          void doc.openPath(event.payload.paths[0]);
        }
      })
    );

    return () => cleanups.forEach((off) => off());
  });
</script>

<div class="app" class:dragging>
  <header class="toolbar">
    <span class="filename" title={doc.path ?? ''}>{doc.dirty ? '● ' : ''}{doc.name}</span>
    <div class="modes" role="group" aria-label="モード">
      <button class:active={doc.mode === 'edit'} onclick={() => (doc.mode = 'edit')}>編集</button>
      <button class:active={doc.mode === 'view'} onclick={() => (doc.mode = 'view')}>MD</button>
    </div>
  </header>

  {#if doc.mode === 'edit'}
    <MarkdownToolbar onselect={(id) => editor.commands.applyTemplate(id)} />
  {/if}

  <main>
    <!-- 編集ビューは非表示でも保持し、モード切替後もUndo履歴とカーソル位置を維持する -->
    <section class="pane" hidden={doc.mode !== 'edit'}>
      <Editor
        bind:this={editor}
        value={doc.content}
        revision={doc.revision}
        onchange={(text) => (doc.content = text)}
      />
    </section>
    {#if doc.mode === 'view'}
      <section class="pane scroll">
        <Preview source={doc.content} />
      </section>
    {/if}
  </main>
</div>
