# MDView

編集モードと参照モードを切り替えられる Markdown エディタ(Tauri 2 + Svelte 5)。

## 機能

- 編集モード: CodeMirror 6(Markdown シンタックスハイライト、Undo/Redo、検索・置換)
- 参照モード: GFM(表・タスクリスト・コードハイライト)のレンダリング表示
- File: New / Open / Open Recent / Save / Save As、ドラッグ&ドロップで開く
- Edit: Undo / Redo / Cut / Copy / Paste / Select All / Find / Replace
- 未保存の変更がある状態で閉じる・開く際の確認ダイアログ

## ショートカット

| 操作 | キー |
| --- | --- |
| 新規 / 開く / 保存 / 名前を付けて保存 | `Cmd/Ctrl+N` / `O` / `S` / `Shift+S` |
| Undo / Redo | `Cmd/Ctrl+Z` / `Shift+Z` |
| 検索 / 置換 | `Cmd/Ctrl+F` / `Alt+F` |
| 編集/参照 切り替え | `Cmd/Ctrl+E` |

## 開発

前提: Node.js, Rust, [Tauri の前提条件](https://tauri.app/start/prerequisites/)

```bash
npm install
npm run tauri dev     # 開発起動
npm run tauri build   # パッケージ作成
npm run check         # 型チェック
```

## 既知の制限

- UTF-8 のファイルのみ対応
- 参照モードでは相対パスの画像は表示されない
- 参照モードでの検索は未対応(Find は編集モードに切り替えて実行)

## ライセンス

MIT License (c) 2026 7thCode
