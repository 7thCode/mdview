# MDView

編集モードと参照モードを切り替えられる Markdown エディタ。Tauri 2(Rust)+ SvelteKit(Svelte 5 / SPA, adapter-static)。
リポジトリ: `7thCode/mdview`。配布は GitHub Releases、ダウンロードページは GitHub Pages(`docs/`)。

## コマンド

```bash
npm install
npm run tauri dev     # 開発起動(Vite は :1420)
npm run tauri build   # パッケージ作成
npm run check         # svelte-check による型チェック(コミット前に必ず通す)
cargo check --manifest-path src-tauri/Cargo.toml   # Rust 側を変更したとき
```

テストランナーは未導入。検証は `npm run check` と、実機での動作確認(`/verify` スキル)で行う。

## 構成

- `src/routes/+page.svelte` — 画面本体。メニューイベント(`menu`)の受信、ショートカット、D&D
- `src/lib/document.svelte.ts` — ドキュメント状態(path / content / dirty / mode)と File 操作。Svelte 5 runes のクラス
- `src/lib/Editor.svelte` — CodeMirror 6 エディタ
- `src/lib/Preview.svelte` + `markdown.ts` — 参照モード(marked + highlight.js + DOMPurify)
- `src/lib/MarkdownToolbar.svelte` + `markdownTemplates.ts` — テンプレート挿入ツールバー
- `src/lib/printMargin.svelte.ts` + `PrintMarginDialog.svelte` — 印刷余白設定
- `src-tauri/src/lib.rs` — ネイティブメニュー、最近使ったファイル、コマンド(`read_file` / `write_file` / `add_recent` / `print_page`)
- `src-tauri/capabilities/default.json` — Tauri の権限。プラグインや window API を使い足したらここにも追加する
- `docs/index.html` — GitHub Pages のダウンロードページ(単一 HTML、最新版は Releases API から実行時に取得)

## 規約

- 言語: 応答・コメント・コミットメッセージ・PR は日本語。識別子は英語
- Svelte 5 の runes(`$state` / `$derived` / `$effect` / `$props`)を使う。Svelte 4 流儀(stores, `on:`)は使わない
- 状態は `document.svelte.ts` に集約し、コンポーネント側に重複して持たない
- 文字コードは UTF-8 のみ。改行(CRLF/LF)は読込時に判定して保存時に復元する(`DocumentState.eol`)
- 参照モードの HTML は必ず DOMPurify を通す。ユーザー入力を直接 `{@html}` しない
- UI 文言は日本語。メニュー項目名(File / Edit / View)は英語のまま
- 新しい依存は必要最小限。追加前に既存機能で足りないか確認する

## Git / リリース

- `main` は保護済み(PR 必須)。作業は `feature/...` ブランチ → PR → マージ。直接 push しない
- コミットメッセージ・PR タイトルは日本語で内容を具体的に(例: 「印刷余白を設定可能にする」)
- リリースは `/release` スキル参照。バージョンは次の 4 箇所を揃える:
  `package.json` / `src-tauri/Cargo.toml` / `src-tauri/Cargo.lock`(mdview の項) / `src-tauri/tauri.conf.json`
  (`package-lock.json` の version は追従していないので触らない)
- タグ `v*` の push で `.github/workflows/build.yml`(`7thCode/actions-templates` の reusable workflow)が走り、
  macOS / Windows / Linux の成果物が Release に付く。ワークフロー本体はこのリポジトリに複製しない

## 生成物(コミットしない・編集しない)

`build/` `.svelte-kit/` `node_modules/` `src-tauri/target/` `src-tauri/gen/`
