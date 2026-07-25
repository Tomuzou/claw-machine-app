// game/ — ゲーム状態管理(残クレジット、獲得判定など)
// TODO(Phase 5): 残クレジットの管理(プレイ開始時に消費、0でゲームオーバー)
// TODO(Phase 5): 落とし口への落下を検知して獲得判定し、スコアを加算する
// TODO(Phase 6): ステージ切り替えとステージごとの初期化

export interface GameState {
  credits: number;
  score: number;
  // TODO(Phase 5): 状態(待機中 / 操作中 / 降下中 / リザルト)を追加
}

export function createGameState(): GameState {
  // TODO(Phase 5): StageConfig から初期クレジットを読み込む
  return { credits: 0, score: 0 };
}
