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
} as const;

/**
 * 把持判定のパラメータ。
 * 「グリップ品質(0〜1)」= 中心ズレ・質量・サイズから計算し、
 * 拘束の強さ・滑り落ち確率・持ち上げ速度すべてに効かせる。
 */
export const GRAB = {
  radius: 0.12, // 爪中心からこの水平距離内の景品だけ掴める(旧: 0.17)
  massPenalty: 1.6, // 重いほどグリップ低下: 1/(1 + mass * この係数)
  sizePenaltyDiv: 0.4, // 大きいほどグリップ低下: 1.2 - 最大辺/この値
  instantSuccessBase: 0.25, // 爪を閉じた瞬間の成功率 = base + grip * 0.9
} as const;

/** ターンごとの制限時間 */
export const TURN = {
  timeLimit: 30, // 待機(操作)フェーズの制限時間(秒)。0になると自動で降下する
  warnAt: 5, // 残りこの秒数からカウントダウン音を鳴らす
} as const;

/**
 * 持ち上げ〜運搬中の「滑り落ち」パラメータ。
 * 事前に落下点を決めるのではなく、毎フレーム連続的に滑り判定を行う。
 * 滑り率(毎秒) = baseRate * (1-grip)^2 * (1 + score*scoreFactor) * (1 + 揺れ速度*swingFactor)
 */
export const SLIP = {
  baseRate: 0.55,
  scoreFactor: 1 / 600, // 高得点の景品ほど滑りやすい(店側の"設定"再現)
  swingFactor: 0.6, // 揺れているほど滑りやすい
} as const;
