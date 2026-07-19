# aradama-survivors-proto

アニメ「刀使ノ巫女」ファンメイドの2Dサバイバーライク。Phaser 3 + TypeScript + Vite。
仕様の正典は docs/03(ゲームデザイン詳細)と docs/04(技術詳細)。必要な節だけ読むこと。

## コマンド

```bash
npm run verify   # 型+テスト+ビルド+実機スモークの一括検証。コミット前に必ず PASS させる
npm test         # Vitest のみ
npm run dev      # 開発サーバ(デバッグキー: O=300体湧き K=+60s I=無敵 P=自動操縦 T=4倍速 M=ミュート)
```

## アーキテクチャ(1画面版)

- `src/scenes/` — Boot(手続きテクスチャ生成) → Title → CharacterSelect → Game ⇄ LevelUp(overlay) → Result
- `src/systems/` — GameScene.update から固定順で呼ばれる: Input → Spawn → Centipede → Enemy(移動/再生/空間ハッシュ再構築) → Ability(迅移/金剛身/八幡力) → Player(移動/オート攻撃/斬撃波) → contact → Pickup → Hud
- `src/entities/` — Player / Enemy / Gem / Projectile(プール対象、`active`+`poolIndex`)/ Centipede(中ボス制御)
- `src/core/` — Phaser非依存の純ロジック(health=ダメージパイプライン, combat=再生/扇判定, xp, upgradeDraw, save, mods, SpatialHash, ObjectPool, Rng, audio=WebAudio合成)
- `src/data/` — **全バランス数値はここだけ**(characters, abilities, enemies, waves, upgrades, balance)
- `tests/` — core と data の純ロジックのみ(Phaser を import しない)

## 鉄則

1. バランス数値・敵定義・強化の変更は `src/data/` 内で完結させる(システム側に分岐を書かない)
2. ラン中の new / GC を避ける: エンティティ・エフェクトはプール、毎フレームの配列/クロージャ生成禁止
3. 新規の純ロジックには Vitest テストを追加(tests/ は Phaser を import できない)
4. 敵参照を保持する場合はプール再利用に注意(`Enemy.generation` で世代照合)
5. 日本語テキストの折り返しは `wordWrap: { useAdvancedWrap: true }` 必須
6. UI文言・コメント・コミットメッセージは日本語

## コミット規約

- 1タスク=1コミット。メッセージは日本語で「何を・なぜ」。末尾に以下を付ける:

```
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

- コミットすると hook が自動で origin へ push する(手動 push 不要)

## 自律ループ(サブエージェント向け)

- タスクは [BACKLOG.md](BACKLOG.md)、運用規約とゲート基準は [docs/06_autonomous_loop.md](docs/06_autonomous_loop.md)
- Coder: 割り当てタスクのみ実装。スコープ拡大禁止。`npm run verify` PASS → コミットまでが完了条件
- Reviewer: 読み取り専用。blocking 基準は docs/06 §Gate 2
