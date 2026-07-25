// types/ — 共通の型定義

/** 3次元ベクトル(座標・サイズ共通) */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 景品メッシュの造形パターン */
export type PrizeArchetype =
  | 'plush_bear' // くま型ぬいぐるみ(胴体+頭+丸耳)
  | 'plush_rabbit' // うさぎ型ぬいぐるみ(長い耳)
  | 'plush_round' // まんまる系ぬいぐるみ(ペンギン・カエルなど)
  | 'figure' // 台座付きフィギュア
  | 'box' // 縦長の箱物
  | 'flatbox' // 平たい箱物(お菓子・ソフトなど)
  | 'ball' // ボール・カプセル
  | 'keychain'; // キーホルダー(小物+リング)

/** 景品カタログの1エントリ(config/prize-catalog.json に対応) */
export interface PrizeCatalogEntry {
  /** カタログ内で一意な種類ID */
  type: string;
  /** 表示名 */
  name: string;
  /** カテゴリ(ぬいぐるみ / フィギュア / キーホルダーなど) */
  category: string;
  /** メッシュの造形パターン */
  archetype: PrizeArchetype;
  /** 配色(CSSカラー文字列)。GLBモデル使用時はフォールバック用 */
  colors: { primary: string; secondary?: string };
  /** public/models/ 内のGLBファイル名。省略時はプリミティブで造形する */
  model?: string;
  /** バウンディングサイズ(単位: m) — 剛体の当たり判定に使用 */
  size: Vec3;
  /** 質量(単位: kg) — cannon-es の剛体に渡す */
  mass: number;
  /** 獲得時のスコア */
  score: number;
}

/** フィールドに配置された景品1個の定義(カタログ + 配置情報) */
export interface PrizeConfig extends PrizeCatalogEntry {
  /** ステージ内で一意なID */
  id: string;
  /** 初期座標(筐体中心を原点とするワールド座標、単位: m) */
  position: Vec3;
  /** 初期回転(オイラー角、単位: ラジアン) */
  rotation: Vec3;
}

/** ステージ1面分の定義 */
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
