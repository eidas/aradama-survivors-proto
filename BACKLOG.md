# 開発バックログ

> 自律開発ループのタスクキュー。運用規約は [docs/06_autonomous_loop.md](docs/06_autonomous_loop.md)。
> 書式: `ID | 状態 | タイトル` + 受け入れ条件。状態: TODO / DOING / REVIEW / DONE / BLOCKED
> 上から優先度順。コーディネーターのみが編集する。

## MUST

## SHOULD

### C1 | DOING | 品質バッチ: レビュー指摘のコード改善
蓄積した non-blocking 指摘のうちコード系をまとめて解消する。**挙動変更なし(リファクタ+防御+テスト)**。
- 受け入れ:
  - 敵IDリテラル比較('amalgam' 等)を定数または EnemyDef 参照に統一(該当: GameScene/Hud/EnemySystem/BossBehavior/Centipede)
  - ボス撃破・ラン終了時に GameScene.boss = null を明示リセット
  - PauseScene の冗長な scene.stop() と InputSystem の到達不能な isChoosing ガードを整理
  - AbilitySystem.emitTrail の距離補間を src/core の純関数に切り出し、境界条件(spacing ちょうど倍数・1フレーム複数個)の Vitest を追加。トレイルプールを 16→24 に増強
  - enemyAiUtils.moveToward の単体テスト追加(tests/ から import 可能な形に。Phaser 型依存を外す)
  - autopilot の閾値(80/120/4)をファイル冒頭の定数に
- 制約: verify PASS、挙動不変(スモーク数値同水準)

### C2 | TODO | 整合バッチ: UI微調整とドキュメント同期
- 受け入れ:
  - ボス名テキストとタイマー表示の重なり解消(余白調整)
  - ポーズ中は BGM を減衰(bgmGain を下げ、再開で戻す)
  - ダメージ数字 OFF 切替時に表示中ポップを即時消去
  - docs/03 §7 に「敵タイプ別撃破内訳」を追記、docs/04 §5 プール表を実装(ダメージ数字=遅延確保200、トレイル24、ディゾルブ40)に同期、docs/05 に balance-sim の前提(Chromium パス)を注記
- 制約: verify PASS

(見送り: リザルトのレイアウトヘルパー化 — 現状2ブロックのみで抽象化の価値が薄いため YAGNI として不採用)

## LATER(着手前にコーディネーターが分割・具体化する)

- メタ進行(周回で恒久強化)
- 追加ステージ(障害物・地形)
- モバイル対応(バーチャルスティック)
- 荒魂特異体(エリート敵)

## 改善メモ(レビューの non-blocking 提案。まとまったら分割してタスク化)

(11件を C1/C2 にタスク化済み。レイアウトヘルパー化のみ YAGNI で不採用)

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

### A3 | DONE | ダメージ数字表示オプション
コミット 79eb1ee。verify PASS(OFF時fps同水準)。Reviewer APPROVE(blocking 0)

### Q1 | DONE | ボスAIの分離リファクタ
コミット cca91b9。verify PASS。EnemySystem 379→217行。Reviewer APPROVE(移動前後の全文突き合わせで挙動不変を確認)

### T1 | DONE | 能力使用ボットでの再計測
コミット ef43af6。verify PASS。可奈美+37%/舞衣+68%の生存伸長を確認、データ調整不要と結論。Reviewer APPROVE。
※Coderがセッション上限で中断→残作業(計測・docs)はコーディネーターが完遂(例外運用として記録)

---
Gate 4 記録(3タスク時点): verify 約30秒(<5分 ✓)/ テスト 43→47件(増加 ✓)/ 直近6コミットに revert なし ✓
Gate 4 記録(6タスク時点): verify 約30秒(<5分 ✓)/ テスト 47件維持(A3はUI中心、減少なし ✓)/ revert なし ✓ / 6連続 APPROVE
