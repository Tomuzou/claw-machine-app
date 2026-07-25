// エントリポイント — 各モジュールを組み立ててゲームループを回す
import './style.css';
import { loadStage } from './config';
import { createScene } from './scene';
import { createMachine } from './scene/machine';
import { Claw } from './scene/claw';
import { createPhysicsWorld } from './physics';
import { createPrizes, syncPrizeMeshes } from './physics/prizes';
import { Controls } from './controls';
import { Sfx } from './audio';
import { Hud } from './game/hud';
import { Game } from './game';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app が見つかりません');

const stage = loadStage();
const { scene, camera, renderer, cameraControls, resetCamera } = createScene(app);
scene.add(createMachine());

const claw = new Claw();
scene.add(claw.group);

const world = createPhysicsWorld();
const prizes = createPrizes(stage, world, scene);

const controls = new Controls(app);
const sfx = new Sfx();
const hud = new Hud(app, stage.name, {
  onCameraReset: resetCamera,
  onToggleMute: () => sfx.toggleMute(),
});
const game = new Game({ world, prizes, claw, controls, hud, sfx, stage });

let last = performance.now();
function loop(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  world.step(1 / 60, dt, 3);
  game.update(dt);
  syncPrizeMeshes(prizes);

  cameraControls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
