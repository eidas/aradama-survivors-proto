# 技術詳細設計

> 4 段階ドキュメントの 4 本目。
> [01 ゲームデザイン概要](01_game_design_overview.md) → [02 技術概要設計](02_technical_overview.md) → [03 ゲームデザイン詳細](03_game_design_detail.md) → **04 技術詳細設計**(本書)

対象: Phaser 3 + TypeScript + Vite(選定理由は 02 参照)。数値仕様は 03 に従い、本書は実装構造とデータスキーマを定義する。

---

## 1. ディレクトリ構成(詳細)

```
src/
├── main.ts                     # Phaser.Game 起動・シーン登録
├── config.ts                   # 解像度・物理設定・デバッグフラグ
├── scenes/
│   ├── BootScene.ts            # アセットロード
│   ├── TitleScene.ts
│   ├── CharacterSelectScene.ts
│   ├── GameScene.ts            # システム群の生成と更新ループ
│   ├── LevelUpScene.ts         # 3択オーバーレイ(GameSceneをpause)
│   └── ResultScene.ts
├── systems/
│   ├── System.ts               # interface System { update(dt: number): void }
│   ├── InputSystem.ts
│   ├── AbilitySystem.ts
│   ├── PlayerSystem.ts
│   ├── SpawnSystem.ts
│   ├── EnemyAISystem.ts
│   ├── MovementSystem.ts
│   ├── CollisionSystem.ts
│   ├── CombatSystem.ts
│   ├── PickupSystem.ts
│   └── LevelUpSystem.ts
├── entities/
│   ├── Player.ts
│   ├── Enemy.ts                # プール対象。typeIdでデータ参照
│   ├── Gem.ts
│   ├── SlashEffect.ts
│   └── Projectile.ts           # 斬撃波・ボスの吐き出し等
├── data/
│   ├── characters.ts           # CharacterDef × 3
│   ├── abilities.ts            # AbilityDef × 4(レベル別テーブル)
│   ├── enemies.ts              # EnemyDef × 6
│   ├── waves.ts                # WavePhase[](タイムテーブル)
│   ├── upgrades.ts             # UpgradeDef × 18
│   └── balance.ts              # 汎用定数(再生率・XP曲線・スケーリング)
├── core/
│   ├── SpatialHash.ts
│   ├── ObjectPool.ts
│   ├── Rng.ts                  # シード可能な乱数(テスト再現用)
│   ├── StatBlock.ts            # 基礎値+修飾(add/mul)の合成
│   └── events.ts               # 型付きイベントバス
└── ui/
    ├── Hud.ts
    ├── UpgradeCard.ts
    └── ResultPanel.ts
tests/
├── xp-curve.test.ts
├── damage-pipeline.test.ts     # 金剛身→写し→HP の吸収順
├── wave-scheduler.test.ts
├── upgrade-draw.test.ts        # 3択抽選(除外・重複なし)
└── spatial-hash.test.ts
```

## 2. データスキーマ

すべて `src/data/` に置く純データ。システムはこれらを読むだけで、個別キャラ・敵の分岐コードを持たない。

```ts
// characters.ts
export interface CharacterDef {
  id: 'kanami' | 'hiyori' | 'mai';
  name: string;
  okatana: string;                    // 表示用: 千鳥/小烏丸/孫六兼元
  hp: number;
  moveSpeed: number;                  // px/s
  attack: {
    power: number;
    interval: number;                 // 秒
    radius: number;                   // px
    arcDeg: number;                   // 扇角
  };
  utsushiCapacityMul: number;         // 写し容量倍率
  pickupRadius: number;
  abilityCaps: Record<AbilityId, number>;  // 例: { utsushi:2, jinI:2, kongoushin:1, hachimanriki:3 }
  passive: PassiveId;                 // 'mitori' | 'iai' | 'mamori'
}

// abilities.ts
export type AbilityId = 'utsushi' | 'jinI' | 'kongoushin' | 'hachimanriki';

export interface UtsushiLevel   { capacity: number; regenDelay: number; regenRate: number }
export interface JinILevel      { speedMul: number; duration: number; cooldown: number }
export interface KongoushinLevel{ gauge: number; regen: number; knockbackRadius: number; shockwaveMul: number }
export interface HachimanrikiLevel { maxStage: number }  // 段階テーブル自体は balance.ts

// enemies.ts
export interface EnemyDef {
  id: string;                         // 'insect' | 'bird' | 'deer' | 'bear' | 'centipede' | 'amalgam'
  hp: number;
  speed: number;
  contactDamage: number;
  radius: number;                     // 衝突半径
  gemDrop: { size: 'S' | 'M' | 'L'; count: number }[];
  ai: AiKind;                         // 'chase' | 'orbitDive' | 'charge' | 'tank' | 'centipede' | 'boss'
  aiParams: Record<string, number>;   // 型ごとの調整値(周回半径、予備動作秒 等)
}

// waves.ts
export interface WavePhase {
  from: number; to: number;           // 秒
  spawnsPer10s: number;               // 線形補間可: [from時点, to時点]
  mix: { enemyId: string; weight: number }[];
  events?: WaveEvent[];               // 群れ突進・大包囲・ボス出現
}

// upgrades.ts
export interface UpgradeDef {
  id: string;
  category: 'okatana' | 'kakuriyo' | 'body';
  maxTakes: number;                   // ★回数。kakuriyo系はキャラのabilityCapsを参照
  isAvailable(run: RunState): boolean;
  apply(run: RunState): void;         // StatBlockへのadd/mul、または能力Lv+1
  textJa: string;
}
```

## 3. 更新ループ

`GameScene.update(time, delta)` から固定順で呼ぶ(02 §3.2 の順序)。

- **可変 dt + 上限クランプ**(`dt = min(delta, 50ms)`)。物理精度が要る箇所(迅移の掃引判定)のみ内部でサブステップ分割する。
- レベルアップ・ポーズ中は `GameScene` を `scene.pause()` し、システムは走らない(タイマーも止まる)。
- 経過時間 `runTime` は独自に加算管理し、`Date.now()` に依存しない(ポーズ・デバッグ時間スキップ対応)。

## 4. 衝突判定

### 4.1 空間ハッシュ

- セルサイズ **64px**(最大敵半径 E6 を除く通常敵 ~24px の 2 倍超)。E6 ボスのみ複数セル登録。
- 毎フレーム `clear()` → 全アクティブ敵を `insert(enemy)` → 問い合わせは「プレイヤー近傍」「攻撃扇形の AABB」「ジェム吸引円」のみ。
- 実装は `Map<number, Enemy[]>`、キーは `(cellX << 16) | cellY`。配列はフレーム間で再利用し GC を避ける。

### 4.2 判定の種類

| 判定 | 方式 |
|---|---|
| 敵接触 → プレイヤー | 円 vs 円。ヒット後 0.5 秒無敵(03 §1.2) |
| 通常攻撃・八幡力 → 敵 | 扇形: 距離 ≤ radius かつ 方向内積 ≥ cos(arc/2) |
| 斬撃波・敵弾 → 対象 | 円 vs 円(Projectile) |
| **迅移の駆け抜け斬り** | 掃引判定: フレーム移動線分 vs 敵円の距離判定。1 回の迅移につき敵ごとに 1 ヒット(`Set<entityId>` で記録) |

- 迅移 Lv3(約 2,600px/s)は 1 フレームで最大 ~43px 進むため、線分判定により すり抜け漏れを防ぐ(02 §8 のリスク対応)。

## 5. オブジェクトプール

| プール | 初期確保 | 上限 |
|---|---|---|
| Enemy | 350 | 400(超過時は最古の画面外小型を消して湧かす) |
| Gem | 1,000 | 1,000(§6 のマージで維持) |
| SlashEffect / Projectile | 100 | 200 |
| ダメージ数字(設定ON時) | 100 | 200 |

- `ObjectPool<T>` は `acquire()/release(obj)` のみの単純実装。エンティティは `active` フラグで管理し、配列の詰め替えをしない(swap-remove)。

## 6. ノロジェムのマージ

- 10 秒ごと、または Gem プール使用率 90% 超過時に実行。
- 空間ハッシュで 48px 以内の S ジェム 5 個 → M 1 個、M 5 個 → L 1 個に統合(価値保存: 1×5=5, 5×5=25)。
- ボス E6 の「吸収」も同じ空間ハッシュ問い合わせを再利用する(半径内のジェム・小型敵を毎秒引き寄せ)。

## 7. 能力の実装

### 7.1 AbilitySystem の状態機械

```
迅移:      Ready → Active(duration) → Cooldown → Ready
金剛身:    Ready ⇄ Guarding(ゲージ消費) → (枯渇時) Lockout(2s) → Ready
八幡力:    Idle → Charging(段階0..cap) → Release(攻撃1回に倍率適用) → Idle
写し:      パッシブ。ダメージパイプラインとregen タイマーのみ
```

- 各能力は `AbilityRuntime { level, state, timer, gauge }` を持ち、レベル別パラメータは `abilities.ts` のテーブル参照。
- **入力の排他**: 金剛身中は移動・攻撃・迅移を禁止。迅移中は金剛身発動不可(八幡力の溜めは維持)。
- 迅移中は `player.collisionMask` から敵接触を外し(すり抜け)、駆け抜け斬りの掃引判定のみ行う。

### 7.2 ダメージパイプライン(CombatSystem)

```ts
function applyDamageToPlayer(dmg: number) {
  if (kongoushin.state === 'Guarding') { emit('guarded', dmg); return; }  // 舞衣パッシブが購読
  if (invincibleTimer > 0) return;
  const toBarrier = Math.min(utsushi.current, dmg);
  utsushi.current -= toBarrier;
  hp -= (dmg - toBarrier);
  utsushi.regenTimer = utsushiLevel.regenDelay;
  invincibleTimer = 0.5;
  if (hp <= 0) emit('runOver');
}
```

- 敵側: `lastHitTime` を持ち、`now - lastHitTime > 3s` で毎秒 `maxHp × 0.05` 回復(03 §1.3)。E5 は節単位。
- キャラパッシブ(見取り稽古/居合/守りの型)はイベントバス購読で実装し、CombatSystem 本体に個別分岐を書かない。

## 8. 敵 AI

`EnemyAISystem` は `def.ai` で処理を振り分けるステートマシン。共通インターフェース:

```ts
interface AiBehavior {
  enter(e: Enemy): void;
  update(e: Enemy, dt: number, ctx: AiContext): void;  // ctx: player位置, runTime, rng
}
```

| AiKind | 状態 |
|---|---|
| chase | Seek のみ |
| orbitDive | Orbit(周回) → Telegraph(0.4s) → Dive(直線) → Orbit |
| charge | Approach → Telegraph(1.0s、コア明滅) → Charge → Stun(1.0s) → Approach |
| tank | Seek → (近接時) Windup(0.8s) → Sweep → Seek |
| centipede | 頭部が蛇行 Seek、節は 1 つ前のセグメント位置を 0.15s 遅延追従(位置履歴リングバッファ) |
| boss | フェーズ制: Absorb / Sweep / ChargeAttack / SpawnMinions を重み付き抽選 |

- Telegraph(予備動作)中の敵はフラグを立て、強化「鍔迫り」の打ち消し判定対象にする。

## 9. スポーンとウェーブ

- `SpawnSystem` は `waves.ts` の `WavePhase[]` を `runTime` で引き、10 秒窓の湧き予算を消化する。
- 湧き位置: 画面外周の帯(カメラ矩形 +80〜160px)から一様乱数。イベント湧き(群れ突進・大包囲)は専用パターン関数。
- ボス出現時(7:30 / 15:00)は通常湧きレートを Phase 定義側で制御(50% / 0%)。
- 乱数は全て `Rng`(シード可)経由。リプレイ・テストの再現性を確保する。

## 10. シーンとゲームフロー

```
BootScene ──> TitleScene ──> CharacterSelectScene ──> GameScene ──┬─> ResultScene
                                                     ▲            │(runOver / bossDown)
                                                     │ resume     │
                                                     └ LevelUpScene(overlay, pause)
```

- `LevelUpScene` は `scene.launch` + `scene.pause('Game')` のオーバーレイ。選択適用後 resume。
- `RunState`(現在ビルド・統計)はシーン間で受け渡すプレーンオブジェクトとし、Phaser の registry に置く。

## 11. セーブ・設定・デバッグ

- `localStorage['aradama-survivors/v1']` に JSON 保存: `{ best: { timeSec, kills, level }, settings: { bgm, se, damageNumbers } }`。スキーマ変更時はキーの `v1` を上げて読み捨てる。
- デバッグフラグ(`config.ts`、`import.meta.env.DEV` 時のみ有効):
  - 時間スキップ(+60s)、無敵、XP 倍率、敵湧き停止、当たり判定・空間ハッシュ表示、fps/エンティティ数オーバーレイ。

## 12. テスト計画

| 対象 | 内容 |
|---|---|
| XP 曲線 | `next(level)` の単調増加・境界値 |
| ダメージパイプライン | 金剛身 → 写し → HP の吸収順、無敵時間、writeback |
| 荒魂再生 | 3 秒無被弾で回復開始、撃破後は再生しない |
| ウェーブスケジューラ | 各 Phase の湧き数・mix 比率・イベント発火時刻(シード固定) |
| 強化抽選 | キャップ済み除外・同一 3 択に重複なし・maxTakes 消化 |
| 空間ハッシュ | insert/query の正当性、セル境界、E6 の複数セル登録 |

- 描画・入力は自動テスト対象外とし、ストレステストシーン(敵 300 体強制湧き)を手動確認用に常備する(02 §8)。

## 13. 実装マイルストーン

| M | 内容 | 完了条件 |
|---|---|---|
| M1 | 骨格 | 移動+オート攻撃+E1 湧き+撃破でジェム化。プール/空間ハッシュ導入済みで敵 300 体 60fps |
| M2 | コアループ | XP/レベルアップ 3 択/強化 18 種/ウェーブテーブル/E2–E4 |
| M3 | 隠世の力 | 迅移・金剛身・八幡力・写しの全レベル、キャラ 3 名+固有パッシブ |
| M4 | ボスと仕上げ | E5/E6、リザルト、セーブ、演出(発光・ディゾルブ)、バランス調整パス |
