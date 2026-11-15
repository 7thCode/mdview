---
name: release
description: MDView の新バージョンをリリースする。バージョン 4 箇所の更新 → PR → マージ → タグ push までの手順。「リリースして」「バージョンを上げて」「v0.x.y を出して」と言われたときに使う。
disable-model-invocation: true
---

# MDView リリース手順

引数: 新バージョン(例: `0.2.3`)。未指定なら直近タグ(`git describe --tags --abbrev=0`)から patch を +1 する案を示し、ユーザーに確認する。

## 手順

1. `git status` / `git branch` で作業ツリーがクリーンで `main` が最新であることを確認(`git pull --ff-only`)
2. ブランチ作成: `git checkout -b chore/bump-version-X.Y.Z`
3. 次の 4 箇所を新バージョンに更新(過去のバンプコミットと同じ構成):
   - `package.json` の `version`
   - `src-tauri/Cargo.toml` の `version`
   - `src-tauri/Cargo.lock` の `name = "mdview"` 直下の `version`
   - `src-tauri/tauri.conf.json` の `version`
   - ※ `package-lock.json` は触らない
4. `git diff` で 4 ファイル・各 1 行だけの変更であることを確認
5. `npm run check` を実行
6. コミット(`Bump version to X.Y.Z`)→ push → `gh pr create`
7. **ここでユーザーに PR のマージを依頼し、マージ確認を待つ**(`main` は PR 必須)
8. マージ後: `git checkout main && git pull --ff-only`
9. **タグ push は外部に公開される操作なので、実行前にユーザーの承認を得る**:
   `git tag vX.Y.Z && git push origin vX.Y.Z`
10. `gh run list --workflow=build.yml --limit 1` でビルド開始を確認し、結果を報告する

## 注意

- `docs/index.html` の最新版表示は Releases API から実行時に取得される。中の固定値は API 失敗時の代替表示なので、必須ではないが、気になる場合は別 PR で更新する
- ビルド失敗時は再タグ付けする前に `gh run view --log-failed` で原因を調べる
