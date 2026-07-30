// config/ — 景品カタログの読み込みと、モードに応じたステージ生成
import catalogJson from './prize-catalog.json';
import { CHUTE } from './constants';
import type { PrizeCatalogEntry, PrizeConfig, StageConfig, Vec3 } from '../types';

/** 全景品カタログ(約20種) */
export const PRIZE_CATALOG = catalogJson as PrizeCatalogEntry[];

/** セレクトモードで一度に選べる上限 */
export const MAX_SELECTED_PRIZES = 12;

/** ランダムモードで配置する景品数 */
const RANDOM_PRIZE_COUNT = 10;

/** 景品の最大辺(m)。サイズ帯の分類とアームスケール計算に使う */
function maxDimension(entry: PrizeCatalogEntry): number {
  return Math.max(entry.size.x, entry.size.y, entry.size.z);
}

/** サイズ帯: 小物(キーホルダー・ボール・箱菓子など)と大物(ぬいぐるみ・フィギュア) */
const SIZE_CLASSES = [
  { key: 'small', label: '小物', match: (e: PrizeCatalogEntry) => maxDimension(e) <= 0.2 },
  { key: 'large', label: 'ぬいぐるみ・フィギュア', match: (e: PrizeCatalogEntry) => maxDimension(e) > 0.2 },
] as const;

/**
 * 景品の平均サイズからアーム(爪)の倍率を決める。
 * 基準 0.22m の景品で等倍。小物ステージでは小さな爪、大物ステージでは大きな爪になる。
 */
function computeClawScale(prizes: PrizeConfig[]): number {
  if (prizes.length === 0) return 1;
  const avg = prizes.reduce((sum, p) => sum + maxDimension(p), 0) / prizes.length;
  return Math.min(1.5, Math.max(0.7, avg / 0.22));
}

/**
 * 配置スロットの一覧を作る。
 * フィールドを 4x4 グリッドに区切り、落とし口と重なる位置は除外する。
 */
function generateSlots(): Array<{ x: number; z: number }> {
  const coords = [-0.45, -0.15, 0.15, 0.45];
  const slots: Array<{ x: number; z: number }> = [];
  for (const x of coords) {
    for (const z of coords) {
      const overChute =
        x > CHUTE.minX - 0.1 && x < CHUTE.maxX + 0.05 && z > CHUTE.minZ - 0.05;
      if (!overChute) slots.push({ x, z });
    }
  }
  // シャッフル(Fisher–Yates)
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

function placePrize(entry: PrizeCatalogEntry, index: number, slot: { x: number; z: number }): PrizeConfig {
  const jitter = (): number => (Math.random() - 0.5) * 0.06;
  const position: Vec3 = {
    x: slot.x + jitter(),
    y: 0.25 + (index % 3) * 0.12, // 少し高さをずらして落として積む
    z: slot.z + jitter(),
  };
  const rotation: Vec3 = { x: 0, y: Math.random() * Math.PI * 2, z: 0 };
  return { ...entry, id: `${entry.type}-${index}`, position, rotation };
}

/**
 * ランダムモード: まずサイズ帯(小物 or 大物)を抽選し、
 * その帯の中から重複ありでランダムに選んで配置する。
 * 大きさの近い景品だけが並ぶので、アームの大きさも噛み合う。
 */
export function buildRandomStage(): StageConfig {
  const sizeClass = SIZE_CLASSES[Math.floor(Math.random() * SIZE_CLASSES.length)];
  const pool = PRIZE_CATALOG.filter(sizeClass.match);
  const slots = generateSlots();
  const count = Math.min(RANDOM_PRIZE_COUNT, slots.length);
  const prizes: PrizeConfig[] = [];
  for (let i = 0; i < count; i++) {
    const entry = pool[Math.floor(Math.random() * pool.length)];
    prizes.push(placePrize(entry, i, slots[i]));
  }
  return {
    id: 'random',
    name: `ランダムモード(${sizeClass.label})`,
    initialCredits: 10,
    clawScale: computeClawScale(prizes),
    prizes,
  };
}

/** セレクトモード: 選んだ種類の景品を1つずつ配置する */
export function buildSelectedStage(types: string[]): StageConfig {
  const slots = generateSlots();
  const selected = types
    .map((type) => PRIZE_CATALOG.find((entry) => entry.type === type))
    .filter((entry): entry is PrizeCatalogEntry => entry !== undefined)
    .slice(0, Math.min(MAX_SELECTED_PRIZES, slots.length));
  const prizes = selected.map((entry, i) => placePrize(entry, i, slots[i]));
  return {
    id: 'select',
    name: 'セレクトモード',
    initialCredits: Math.max(5, prizes.length * 2),
    clawScale: computeClawScale(prizes),
    prizes,
  };
}
