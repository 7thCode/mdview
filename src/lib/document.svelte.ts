import { invoke } from '@tauri-apps/api/core';
import { message, open, save } from '@tauri-apps/plugin-dialog';

export type Mode = 'edit' | 'view';

const FILE_FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown', 'mdx', 'txt'] },
  { name: 'All Files', extensions: ['*'] }
];

const SAVE_LABEL = '保存';
const DISCARD_LABEL = '保存しない';
const CANCEL_LABEL = 'キャンセル';

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

class DocumentState {
  path = $state<string | null>(null);
  content = $state('');
  savedContent = $state('');
  mode = $state<Mode>('edit');
  /** エディタへ本文を再設定(Undo履歴のリセット)させるためのカウンタ */
  revision = $state(0);
  private eol: '\n' | '\r\n' = '\n';

  get dirty(): boolean {
    return this.content !== this.savedContent;
  }

  get name(): string {
    return this.path ? basename(this.path) : '無題';
  }

  private replace(path: string | null, text: string) {
    this.eol = text.includes('\r\n') ? '\r\n' : '\n';
    const normalized = text.replace(/\r\n/g, '\n');
    this.path = path;
    this.content = normalized;
    this.savedContent = normalized;
    this.revision++;
  }

  private async reportError(error: unknown) {
    await message(String(error), { title: 'エラー', kind: 'error' });
  }

  /** 未保存の変更があれば確認する。続行してよければ true。 */
  async confirmDiscard(): Promise<boolean> {
    if (!this.dirty) return true;
    const answer = await message(`「${this.name}」への変更を保存しますか?`, {
      title: 'MDView',
      kind: 'warning',
      buttons: { yes: SAVE_LABEL, no: DISCARD_LABEL, cancel: CANCEL_LABEL }
    });
    if (answer === SAVE_LABEL || answer === 'Yes') return this.save();
    return answer === DISCARD_LABEL || answer === 'No';
  }

  async newDocument() {
    if (!(await this.confirmDiscard())) return;
    this.replace(null, '');
  }

  async openDialog() {
    if (!(await this.confirmDiscard())) return;
    const selected = await open({ multiple: false, directory: false, filters: FILE_FILTERS });
    if (typeof selected === 'string') await this.load(selected);
  }

  async openPath(path: string) {
    if (!(await this.confirmDiscard())) return;
    await this.load(path);
  }

  private async load(path: string) {
    try {
      const text = await invoke<string>('read_file', { path });
      this.replace(path, text);
      await invoke('add_recent', { path });
    } catch (error) {
      await this.reportError(error);
    }
  }

  /** 保存できたら true(キャンセル・失敗は false) */
  async save(): Promise<boolean> {
    return this.path ? this.write(this.path) : this.saveAs();
  }

  async saveAs(): Promise<boolean> {
    const target = await save({
      defaultPath: this.path ?? `${this.name}.md`,
      filters: FILE_FILTERS
    });
    return target ? this.write(target) : false;
  }

  private async write(path: string): Promise<boolean> {
    const snapshot = this.content;
    try {
      const text = this.eol === '\r\n' ? snapshot.replace(/\n/g, '\r\n') : snapshot;
      await invoke('write_file', { path, content: text });
      this.path = path;
      this.savedContent = snapshot;
      await invoke('add_recent', { path });
      return true;
    } catch (error) {
      await this.reportError(error);
      return false;
    }
  }

  toggleMode() {
    this.mode = this.mode === 'edit' ? 'view' : 'edit';
  }
}

export const doc = new DocumentState();
