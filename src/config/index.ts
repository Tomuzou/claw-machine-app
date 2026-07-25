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

/** ランダムモード: カタログから重複ありでランダムに選んで配置する */
export function buildRandomStage(): StageConfig {
  const slots = generateSlots();
  const count = Math.min(RANDOM_PRIZE_COUNT, slots.length);
  const prizes: PrizeConfig[] = [];
  for (let i = 0; i < count; i++) {
    const entry = PRIZE_CATALOG[Math.floor(Math.random() * PRIZE_CATALOG.length)];
    prizes.push(placePrize(entry, i, slots[i]));
  }
  return { id: 'random', name: 'ランダムモード', initialCredits: 10, prizes };
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
    prizes,
  };
}
