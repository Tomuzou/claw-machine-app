# claw-machine-app

Three.js と cannon-es で作る 3D UFOキャッチャー(クレーンゲーム)。
bowling-app / soccer-app と同じ構成方針のホビープロジェクトです。

**▶ プレイはこちら: https://tomuzou.github.io/claw-machine-app/**

## 遊び方

### ゲームモード

起動するとモード選択画面が表示されます。

- **🎲 ランダムモード**: サイズ帯(小物 / ぬいぐるみ・フィギュア)を抽選し、その帯からおまかせで10個が並ぶ
- **🎯 セレクトモード**: 狙いたい景品を自分で選んで(最大12個)配置する
- アーム(爪)の大きさはステージの景品サイズに合わせて自動調整されます

### 操作

- **移動**: 矢印キー / WASD / 画面の方向ボタン(前後・左右)
- **降下**: スペース / Enter / 画面の「降下」ボタン(1クレジット消費)
- **制限時間**: 操作フェーズは30秒。残り5秒からカウントダウン音が鳴り、時間切れでその場から自動降下
- **視点変更**: マウスドラッグで回転、ホイールでズーム(タッチ: 1本指で回転、ピンチでズーム)。可動範囲は筐体正面側に制限。「📷 視点リセット」で初期視点に戻る
- **効果音**: 🔊ボタンでON/OFF
- アームが降りて爪が閉じ、掴めた景品は落とし口の上まで自動で運ばれます
- **把持はグリップ品質制**: 爪の真下にどれだけ正確に重ねたか・景品の重さ・大きさで「グリップ品質」が決まります。グリップが低いと掴み損ねたり、弱々しくぶら下がったまま運搬中に滑り落ちたりします(本物のUFOキャッチャーと同じ理不尽さ！)
- 重い景品は持ち上げ・運搬がゆっくりになり、揺れているほど滑りやすくなります。高得点の景品ほど滑りやすい"設定"です
- 落とし口に景品が落ちるとスコア獲得。クレジットが尽きたらリセットで再挑戦

## 技術スタック

- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) — ビルド・開発サーバー
- [Three.js](https://threejs.org/) — 3D レンダリング
- [cannon-es](https://pmndrs.github.io/cannon-es/) — 物理エンジン

## セットアップ

```bash
npm install
npm run dev      # 開発サーバー起動 (http://localhost:5173)
npm run build    # 本番ビルド
npm run preview  # ビルド結果のプレビュー
```

## ディレクトリ構成

```
src/
  main.ts      # エントリポイント
  audio/       # 効果音(WebAudioで合成、外部音源ファイル不要)
  scene/       # カメラ・ライト・筐体の3Dモデル、OrbitControlsによる視点操作
  physics/     # cannon-es のワールド初期化、景品の剛体とメッシュ生成
  controls/    # アーム操作(前後・左右・降下)の入力処理
  game/        # ゲーム状態管理、HUD、モード選択画面
  config/      # 景品カタログJSON(約20種)とステージ生成ロジック
  types/       # 共通の型定義
```

## 開発フェーズのロードマップ

- [x] **Phase 1**: 筐体とアームの3D表示、カメラ設定
- [x] **Phase 2**: cannon-es の物理ワールド構築、景品の落下・積み重なり
- [x] **Phase 3**: アームの3軸移動制御と入力UI
- [x] **Phase 4**: 爪の開閉アニメーションと把持判定(掴んだ瞬間にconstraintで拘束、確率で意図的に落とす)
- [x] **Phase 5**: 落とし口の判定、スコアとクレジット管理
- [x] **Phase 6**: JSONによる景品カタログ(約20種)の読み込み、ランダム/セレクトの2モード対応
- [ ] **Phase 7**: サウンド、演出、UI仕上げ(効果音とカメラ操作は実装済み)

## 3Dモデルのクレジット

景品の3Dモデルは [Poly Pizza](https://poly.pizza/) で公開されているフリー素材を使用しています。
GLBモデルが未指定・読み込み失敗の景品はプリミティブによる手続き生成で表示されます。

| モデル | 作者 | ライセンス |
| --- | --- | --- |
| Rabbit / Cat / Frog / Astronaut / Robot | [Quaternius](https://quaternius.com/) | CC0 |
| Panda | jeremy | CC0 |
| Bear Cub | Poly by Google | CC0 |
| [Bear](https://poly.pizza/m/3Eb9oLfZYIc) | jiang liu | CC-BY |
| [Penguin](https://poly.pizza/m/9Ift-39Akov) | jeremy | CC-BY |

## デプロイ

`main` ブランチへの push で GitHub Actions が自動ビルドし、GitHub Pages へデプロイされます
([.github/workflows/deploy.yml](.github/workflows/deploy.yml))。
