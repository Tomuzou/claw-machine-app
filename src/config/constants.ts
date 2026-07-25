// 筐体・アーム・落とし口の寸法とゲームバランスの定数(長さの単位: m)

/** プレイフィールド(ガラスケース内)の寸法 */
export const FIELD = {
  width: 1.2, // x方向
  depth: 1.2, // z方向(+z が手前=カメラ側)
  wallHeight: 0.9,
  floorThickness: 0.05,
} as const;

/** 落とし口(手前左の穴)の範囲と獲得判定 */
export const CHUTE = {
  minX: -0.6,
  maxX: -0.28,
  minZ: 0.28,
  maxZ: 0.6,
  guardHeight: 0.12, // 穴の縁の仕切り壁の高さ
  captureY: -0.25, // これより下に落ちた景品は「獲得」扱い
} as const;

/** アーム(クレーン)の可動範囲と速度 */
export const CLAW = {
  minX: -0.45,
  maxX: 0.45,
  minZ: -0.45,
  maxZ: 0.45,
  railY: 1.08, // レールの高さ
  topY: 0.92, // 待機時のクレーンヘッド(ハブ)の高さ
  bottomY: 0.16, // 降下の下限(ハブ基準。爪先はさらに約0.2下)
  carryY: 0.78, // 持ち上げ後の運搬高さ
  moveSpeed: 0.5, // 水平移動速度 (m/s)
  descendSpeed: 0.6,
  liftSpeed: 0.45,
  homeX: -0.44, // 落とし口の真上(初期位置・リリース位置)
  homeZ: 0.44,
  grabRadius: 0.17, // 爪先からこの水平距離内の景品を掴める
} as const;

/** ターンごとの制限時間 */
export const TURN = {
  timeLimit: 30, // 待機(操作)フェーズの制限時間(秒)。0になると自動で降下する
  warnAt: 5, // 残りこの秒数からカウントダウン音を鳴らす
} as const;

/** 「確率で意図的に落とす」挙動のパラメータ */
export const DROP = {
  baseChance: 0.2, // 最低の落下確率
  perScore: 1 / 800, // スコアに比例して確率を上げる係数
  maxChance: 0.65,
} as const;
