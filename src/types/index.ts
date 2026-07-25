// types/ — 共通の型定義

/** 3次元ベクトル(座標・サイズ共通) */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 景品1個の配置定義(config/*.json の prizes 要素に対応) */
export interface PrizeConfig {
  /** ステージ内で一意なID */
  id: string;
  /** 景品の種類(3Dモデル・見た目の切り替えに使用) */
  type: string;
  /** 初期座標(筐体中心を原点とするワールド座標、単位: m) */
  position: Vec3;
  /** 初期回転(オイラー角、単位: ラジアン) */
  rotation: Vec3;
  /** 質量(単位: kg) — cannon-es の剛体に渡す */
  mass: number;
  /** バウンディングサイズ(単位: m) — 剛体の当たり判定に使用 */
  size: Vec3;
  /** 獲得時のスコア */
  score: number;
}

/** ステージ1面分の定義(config/*.json に対応) */
export interface StageConfig {
  /** ステージの一意なID */
  id: string;
  /** 表示名 */
  name: string;
  /** 開始時の残クレジット */
  initialCredits: number;
  /** 景品の配置リスト */
  prizes: PrizeConfig[];
}
