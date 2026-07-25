// エントリポイント — 各モジュールを組み立ててゲームループを回す
// 起動時はモード選択画面を表示し、選択後に景品とゲーム状態を生成する
import './style.css';
import { createScene } from './scene';
import { createMachine } from './scene/machine';
import { Claw } from './scene/claw';
import { createPhysicsWorld } from './physics';
import { createPrizes, syncPrizeMeshes, type PrizeEntity } from './physics/prizes';
import { Controls } from './controls';
import { Sfx } from './audio';
import { Hud } from './game/hud';
import { Game } from './game';
import { showModeSelect } from './game/modeSelect';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app が見つかりません');

const { scene, camera, renderer, cameraControls, resetCamera } = createScene(app);
scene.add(createMachine());

const claw = new Claw();
scene.add(claw.group);

const world = createPhysicsWorld();
const controls = new Controls(app);
const sfx = new Sfx();

let prizes: PrizeEntity[] = [];
let game: Game | null = null;

showModeSelect(app, (stage) => {
  prizes = createPrizes(stage, world, scene);
  const hud = new Hud(app, stage.name, {
    onCameraReset: resetCamera,
    onToggleMute: () => sfx.toggleMute(),
  });
  game = new Game({ world, prizes, claw, controls, hud, sfx, stage });
});

let last = performance.now();
function loop(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  world.step(1 / 60, dt, 3);
  if (game) {
    game.update(dt);
  } else {
    claw.update(dt);
  }
  syncPrizeMeshes(prizes);

  cameraControls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
