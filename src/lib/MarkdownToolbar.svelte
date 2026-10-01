<script lang="ts">
  import { TEMPLATE_BUTTONS, type TemplateId } from './markdownTemplates';

  let { onselect }: { onselect: (id: TemplateId) => void } = $props();
</script>

<div class="markdown-toolbar" role="toolbar" aria-label="Markdown テンプレート">
  {#each TEMPLATE_BUTTONS as { id, label, title } (id)}
    <span class="tooltip" data-tooltip={title}>
      <button type="button" aria-label={title} onclick={() => onselect(id)}>{label}</button>
    </span>
  {/each}
</div>

<style>
  .markdown-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px 12px;
    background: var(--bg-alt);
    border-bottom: 1px solid var(--border);
    user-select: none;
  }

  .tooltip {
    position: relative;
    display: inline-flex;
  }

  .tooltip::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    padding: 3px 7px;
    border-radius: 4px;
    background: var(--text);
    color: var(--bg);
    font-size: 11px;
    line-height: 1.4;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, 2px);
    transition: opacity 0.1s ease, transform 0.1s ease;
    z-index: 10;
  }

  .tooltip:hover::after,
  .tooltip:focus-within::after {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  button {
    padding: 2px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: 12px;
    line-height: 1.6;
    cursor: pointer;
  }

  button:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
