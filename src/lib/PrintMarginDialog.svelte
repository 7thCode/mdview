<script lang="ts">
  import { MARGIN_MAX, MARGIN_MIN, MARGIN_PRESETS, clampMargin, printMargin } from './printMargin.svelte';

  let { onclose }: { onclose: () => void } = $props();

  let value = $state(printMargin.mm);

  function apply() {
    printMargin.set(value);
    onclose();
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div
  class="backdrop"
  role="presentation"
  onclick={(e) => e.target === e.currentTarget && onclose()}
>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="印刷の余白">
  <form
    onsubmit={(e) => {
      e.preventDefault();
      apply();
    }}
  >
    <h2>印刷の余白</h2>
    <div class="presets">
      {#each MARGIN_PRESETS as { label, mm } (mm)}
        <button type="button" class:active={clampMargin(value) === mm} onclick={() => (value = mm)}>
          {label} ({mm}mm)
        </button>
      {/each}
    </div>
    <label class="field">
      上下左右
      <!-- svelte-ignore a11y_autofocus -->
      <input type="number" min={MARGIN_MIN} max={MARGIN_MAX} step="1" bind:value autofocus />
      mm
    </label>
    <div class="actions">
      <button type="button" onclick={onclose}>キャンセル</button>
      <button type="submit" class="primary">OK</button>
    </div>
  </form>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.4);
  }

  .dialog {
    min-width: 320px;
    padding: 20px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
  }

  h2 {
    margin: 0 0 14px;
    font-size: 15px;
  }

  .presets,
  .actions {
    display: flex;
    gap: 8px;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 14px 0 18px;
  }

  input {
    width: 72px;
    padding: 4px 6px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-alt);
    color: var(--text);
    font: inherit;
  }

  button {
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-alt);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }

  button.active,
  button.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }

  .actions {
    justify-content: flex-end;
  }
</style>
