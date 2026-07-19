# 開発バックログ

> 自律開発ループのタスクキュー。運用規約は [docs/06_autonomous_loop.md](docs/06_autonomous_loop.md)。
> 書式: `ID | 状態 | タイトル` + 受け入れ条件。状態: TODO / DOING / REVIEW / DONE / BLOCKED
> 上から優先度順。コーディネーターのみが編集する。

## MUST

## SHOULD

### A3 | DOING | ダメージ数字表示オプション
設定(セーブ)にダメージ数字ON/OFFを追加(既定OFF)。ONで敵ヒット時に数字をポップ表示。
- 受け入れ: docs/03 §8 準拠(既定OFF)/ プール管理・上限200 / Nキーでトグル

### Q1 | TODO | ボスAIの分離リファクタ
EnemySystem 内のボス処理(updateBoss/bossSpit/bossAbsorb)を独立モジュールへ分離する。
- 受け入れ: 挙動不変(テスト・スモーク通過)/ EnemySystem の行数削減

### T1 | TODO | 能力使用ボットでの再計測
自動操縦ボットに迅移(囲まれたら)・金剛身(急降下予兆で)を使わせ、docs/05 に結果を追記。
- 受け入れ: docs/05 に計測表追加 / 必要ならデータ調整の提案(適用は別タスク)

## LATER(着手前にコーディネーターが分割・具体化する)

- メタ進行(周回で恒久強化)
- 追加ステージ(障害物・地形)
- モバイル対応(バーチャルスティック)
- 荒魂特異体(エリート敵)

## 改善メモ(レビューの non-blocking 提案。まとまったら分割してタスク化)

- ボス名テキストとタイマー表示の余白調整(B2レビューより)
- `'amalgam'` 等の敵IDリテラル比較を定数参照へ(B2レビューより)
- ボス撃破時に `GameScene.boss = null` の明示リセット(B2レビューより)
- ポーズ中の BGM 減衰またはミュート(A2レビューより)
- PauseScene の restart/toTitle の冗長な scene.stop() 整理、InputSystem の到達不能な isChoosing ガード整理(A2レビューより)
- docs/03 §7 リザルト仕様に「敵タイプ別内訳」を追記(A1レビューより)
- リザルトの左右ブロック配置のレイアウトヘルパー化(A1レビューより)
- 迅移トレイルのプール16は Lv3+健脚ビルドでギリギリ。emitTrail の距離補間を src/core に切り出してテスト化も検討(B1レビューより)

## DONE

### B2 | DONE | ボス戦HPバー
コミット ccb5891。verify PASS(スモーク: 撃破40/fps51→36)。Reviewer APPROVE(blocking 0)

### A2 | DONE | ポーズメニュー(ESC)
コミット 32964dd。verify PASS(スモーク: 撃破39/fps51→38)。Reviewer APPROVE(blocking 0)。
既知の制約: ポーズ中は M キー等の入力不可(仕様許容)

### A1 | DONE | リザルトに敵タイプ別撃破数
コミット 7546c79。verify PASS(テスト47件に増加)。Reviewer APPROVE(blocking 0)

### P1 | DONE | 撃破ディゾルブのプール化
コミット c517e89。verify PASS(fps 51→38、悪化なし)。Reviewer APPROVE(blocking 0)

### B1 | DONE | 迅移の残像トレイル
コミット ee3af4b。verify PASS(fps同水準)。Reviewer APPROVE(blocking 0、境界条件トレース済み)

---
Gate 4 記録(3タスク時点): verify 約30秒(<5分 ✓)/ テスト 43→47件(増加 ✓)/ 直近6コミットに revert なし ✓
