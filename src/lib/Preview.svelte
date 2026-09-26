<script lang="ts">
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { renderMarkdown } from './markdown';

  let { source }: { source: string } = $props();

  const html = $derived(renderMarkdown(source));

  function onclick(event: MouseEvent) {
    const anchor = (event.target as HTMLElement).closest('a');
    const href = anchor?.getAttribute('href');
    if (!anchor || !href || href.startsWith('#')) return;
    event.preventDefault();
    if (/^(https?:|mailto:)/i.test(href)) void openUrl(href);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<article class="preview markdown-body" {onclick}>
  {@html html}
</article>
