# 出どころ

- リポジトリ: https://github.com/cloudflare/security-audit-skill （Cloudflare 公式、MIT ライセンス。LICENSE を同梱）
- 取り込んだコミット: c1c8a8c1471069fb0e188eeaff69b8e8db6564a8（2026-09-23 取得）
- 取り込んだもの: `skills/security-audit/` のうち、手順書（*.md）・`report-schema.json`・検証スクリプト2本（`validate-*.cjs`）。テスト用の `*.test.cjs` は含めない
- 取り込み前の確認: 手順書に外部への送信・自動インストールの指示が無いこと、検証スクリプトはファイルを読むだけ（通信・書き込み・別プログラムの起動なし）であることを確かめた
- 取り込みはディレクターの指示（2026-09-23「AISKills の精査」）。更新するときは同じ確認をしてから差し替える
