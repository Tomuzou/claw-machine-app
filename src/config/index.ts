// config/ — ステージ定義の読み込み
// TODO(Phase 6): 複数ステージの切り替え・ステージ選択UIに対応する
import stage01 from './stage-01.json';
import type { StageConfig } from '../types';

export function loadStage(): StageConfig {
  return stage01 as StageConfig;
}
