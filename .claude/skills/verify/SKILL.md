---
name: verify
description: MDView の変更を検証する。型チェック・Rust ビルド確認・開発起動での動作確認チェックリスト。実装後、PR を出す前に使う。
---

# MDView 変更の検証

## 1. 静的チェック(必須)

```bash
npm run check
cargo check --manifest-path src-tauri/Cargo.toml   # src-tauri を変更した場合のみ
```

エラーは握りつぶさず原因を直す。警告を増やさない。

## 2. 動作確認(UI / 挙動を変えた場合)

`npm run tauri dev` で起動し、変更に関係する項目を確認する。
(Tauri の API を使う機能は `npm run dev` のブラウザ単体では動かない)

- [ ] 編集 ⇄ 参照の切り替え(`Cmd/Ctrl+E`)
- [ ] New / Open / Save / Save As、Open Recent、D&D で開く
- [ ] 未保存状態で閉じる・開く・New したときの確認ダイアログ(保存 / 保存しない / キャンセル)
- [ ] CRLF のファイルを開いて保存しても改行が維持される
- [ ] 参照モードで表・タスクリスト・コードハイライトが表示される
- [ ] テンプレートツールバーの挿入(編集モードのみ有効)
- [ ] 印刷ダイアログと余白設定
- [ ] 新しい Tauri API を使った場合、`src-tauri/capabilities/default.json` に権限があること

## 3. 報告

実行したコマンドと結果、確認できた項目・できなかった項目(GUI を操作できなかった等)を正直に分けて報告する。
