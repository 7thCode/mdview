<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { defaultKeymap, history, historyKeymap, redo, undo } from '@codemirror/commands';
  import { markdown } from '@codemirror/lang-markdown';
  import { languages } from '@codemirror/language-data';
  import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
  import { highlightSelectionMatches, openSearchPanel, search, searchKeymap } from '@codemirror/search';
  import { Compartment, EditorState } from '@codemirror/state';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { drawSelection, EditorView, keymap } from '@codemirror/view';

  let {
    value,
    revision,
    onchange
  }: { value: string; revision: number; onchange: (text: string) => void } = $props();

  let host: HTMLDivElement;
  let view: EditorView | undefined;
  const themeSlot = new Compartment();
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const themeFor = (dark: boolean) => (dark ? oneDark : []);

  function createState(text: string) {
    return EditorState.create({
      doc: text,
      extensions: [
        history(),
        drawSelection(),
        highlightSelectionMatches(),
        search({ top: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        markdown({ codeLanguages: languages }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        EditorView.lineWrapping,
        themeSlot.of(themeFor(darkQuery.matches)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onchange(update.state.doc.toString());
        })
      ]
    });
  }

  onMount(() => {
    view = new EditorView({ state: createState(untrack(() => value)), parent: host });
    const onThemeChange = (event: MediaQueryListEvent) =>
      view?.dispatch({ effects: themeSlot.reconfigure(themeFor(event.matches)) });
    darkQuery.addEventListener('change', onThemeChange);
    return () => {
      darkQuery.removeEventListener('change', onThemeChange);
      view?.destroy();
    };
  });

  let appliedRevision = untrack(() => revision);
  $effect(() => {
    const next = revision;
    if (!view || next === appliedRevision) return;
    appliedRevision = next;
    // 新しい State に差し替えることで Undo 履歴もリセットされる
    view.setState(createState(untrack(() => value)));
  });

  export const commands = {
    undo: () => view && undo(view),
    redo: () => view && redo(view),
    find: () => view && (openSearchPanel(view), view.focus()),
    focus: () => view?.focus()
  };
</script>

<div class="editor" bind:this={host}></div>

<style>
  .editor {
    height: 100%;
    overflow: hidden;
  }
  .editor :global(.cm-editor) {
    height: 100%;
    font-size: 15px;
  }
  .editor :global(.cm-scroller) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    line-height: 1.6;
    padding: 8px 4px;
  }
  .editor :global(.cm-editor.cm-focused) {
    outline: none;
  }
</style>
