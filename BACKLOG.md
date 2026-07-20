# 開発バックログ

> 自律開発ループのタスクキュー。運用規約は [docs/06_autonomous_loop.md](docs/06_autonomous_loop.md)。
> 書式: `ID | 状態 | タイトル` + 受け入れ条件。状態: TODO / DOING / REVIEW / DONE / BLOCKED
> 上から優先度順。コーディネーターのみが編集する。

## MUST

## SHOULD

### M2 | DOING | メタ進行: 鍛錬UI(TrainingScene)
docs/07 §4 に従う。M1 完了後に着手。
- 受け入れ: タイトルから遷移(Tキー/クリック)/ 5系統の表示・購入・リセット(確認つき)・ESCで戻る / 所持ノロ常時表示 / 日本語折り返しは useAdvancedWrap / verify PASS

### M3 | TODO | メタ進行: ラン組み込み
docs/07 §2.3・§6 に従う。M1 完了後に着手。
- 受け入れ: 取得XP累計の記録 / endRun で持ち帰り加算・保存 / リザルトに「持ち帰りノロ +N(累計M)」表示 / 鍛錬効果をラン開始時に Player の実効値へ合成(RunMods と別枠、ラン内強化と乗算) / balance-sim は鍛錬0段階で走る規約を docs/05 に追記 / verify PASS

(見送り記録: リザルトのレイアウトヘルパー化 — 現状2ブロックのみで抽象化の価値が薄いため YAGNI として不採用)

## LATER(着手前にコーディネーターが分割・具体化する)

- メタ進行(周回で恒久強化)
- 追加ステージ(障害物・地形)
- モバイル対応(バーチャルスティック)
- 荒魂特異体(エリート敵)

## 改善メモ(レビューの non-blocking 提案。まとまったら分割してタスク化)

- 特異体の見た目: setTintFill(全身紫)は視認性優先の暫定。将来「黒い体+紫コアのみ発光」の専用テクスチャかパーティクルに置き換え検討(E1レビューより)
- meta.ts: stage の負値/超過クランプと未知 TrainingId の明示テスト(M1レビューより)

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

### C1 | DONE | 品質バッチ: レビュー指摘のコード改善
コミット 1d8322f。verify PASS(テスト47→60件)。Reviewer APPROVE(ID統一・trail純関数の等価性・型緩和の不変性を検証)。
挙動変更なし。付随対応: スモークの固定待ちフレークを verify.mjs のポーリング待ちに変更(コーディネーター、2連続PASS確認)、
reviewer 定義に作業ツリー変更禁止を明記

### T1 | DONE | 能力使用ボットでの再計測
コミット ef43af6。verify PASS。可奈美+37%/舞衣+68%の生存伸長を確認、データ調整不要と結論。Reviewer APPROVE。
※Coderがセッション上限で中断→残作業(計測・docs)はコーディネーターが完遂(例外運用として記録)

### C2 | DONE | 整合バッチ: UI微調整とドキュメント同期
コミット 60531ae。verify PASS。ボスHUD実機スクショ確認済み。Reviewer APPROVE(指摘ゼロ)

### E1 | DONE | 荒魂特異体(エリート敵)
コミット cd098b0。verify PASS(テスト60→64件)。Reviewer APPROVE(全spawn経路のリセット・排他ドロップ・ボス吸収成長との非干渉を確認)

### M1 | DONE | メタ進行: データ+純ロジック+セーブ拡張
コミット d12ab3c。verify PASS。Reviewer APPROVE(docs/07 との数値一致・不変性・返金額・後方互換を確認)

---
Gate 4 記録(3タスク時点): verify 約30秒(<5分 ✓)/ テスト 43→47件(増加 ✓)/ 直近6コミットに revert なし ✓
Gate 4 記録(6タスク時点): verify 約30秒(<5分 ✓)/ テスト 47件維持(A3はUI中心、減少なし ✓)/ revert なし ✓ / 6連続 APPROVE
Gate 4 記録(10タスク時点): verify 約25秒(<5分 ✓、フレーク修正済み)/ テスト 47→60件(増加 ✓)/ revert なし ✓ / 10連続 APPROVE
