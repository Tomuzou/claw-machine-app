# claw-machine-app

Three.js と cannon-es で作る 3D UFOキャッチャー(クレーンゲーム)。
bowling-app / soccer-app と同じ構成方針のホビープロジェクトです。

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
  scene/       # カメラ・ライト・筐体の3Dモデル
  physics/     # cannon-es のワールド初期化、景品の剛体定義
  controls/    # アーム操作(前後・左右・降下)の入力処理
  game/        # ゲーム状態管理(残クレジット、獲得判定など)
  config/      # ステージ・景品配置のJSON定義
  types/       # 共通の型定義
```

## 開発フェーズのロードマップ

- **Phase 1**: 筐体とアームの3D表示、カメラ設定
- **Phase 2**: cannon-es の物理ワールド構築、景品の落下・積み重なり
- **Phase 3**: アームの3軸移動制御と入力UI
- **Phase 4**: 爪の開閉アニメーションと把持判定(掴んだ瞬間にconstraintで拘束、確率で意図的に落とす)
- **Phase 5**: 落とし口の判定、スコアとクレジット管理
- **Phase 6**: JSONによるステージ定義の読み込み、複数ステージ対応
- **Phase 7**: サウンド、演出、UI仕上げ
