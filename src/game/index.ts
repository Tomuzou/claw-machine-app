// game/ — ゲーム状態管理(状態機械・把持判定・スコアとクレジット)
import * as CANNON from 'cannon-es';
import { CLAW, CHUTE, DROP } from '../config/constants';
import type { Claw } from '../scene/claw';
import type { Controls } from '../controls';
import type { PrizeEntity } from '../physics/prizes';
import type { StageConfig } from '../types';
import type { Sfx } from '../audio';
import type { Hud } from './hud';

export type GamePhase =
  | 'idle' // 待機中(移動操作を受け付ける)
  | 'descending' // アーム降下中
  | 'grabbing' // 爪を閉じて把持を試みる
  | 'lifting' // 持ち上げ中
  | 'carrying' // 落とし口の上へ運搬中
  | 'releasing' // リリースして待機位置へ
  | 'gameover';

interface GameDeps {
  world: CANNON.World;
  prizes: PrizeEntity[];
  claw: Claw;
  controls: Controls;
  hud: Hud;
  sfx: Sfx;
  stage: StageConfig;
}

const IDLE_MESSAGE = '移動: 矢印キー / ボタン　降下: スペース / ボタン(1クレジット)';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export class Game {
  private readonly world: CANNON.World;
  private readonly prizes: PrizeEntity[];
  private readonly claw: Claw;
  private readonly controls: Controls;
  private readonly hud: Hud;
  private readonly sfx: Sfx;

  private phase: GamePhase = 'idle';
  private credits: number;
  private score = 0;

  /** 掴んでいる景品と拘束(constraint) */
  private heldPrize: PrizeEntity | null = null;
  private constraint: CANNON.PointToPointConstraint | null = null;
  /** 爪追従用のキネマティックなアンカーボディ */
  private readonly anchor: CANNON.Body;

  /** 運搬中に「意図的に落とす」進行度(0-1)。null なら最後まで運ぶ */
  private dropAtProgress: number | null = null;
  private carryStart = { x: 0, z: 0, dist: 1 };
  private grabTimer = 0;
  private releaseTimer = 0;

  constructor(deps: GameDeps) {
    this.world = deps.world;
    this.prizes = deps.prizes;
    this.claw = deps.claw;
    this.controls = deps.controls;
    this.hud = deps.hud;
    this.sfx = deps.sfx;
    this.credits = deps.stage.initialCredits;

    this.anchor = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Sphere(0.02),
      collisionFilterMask: 0, // 何とも衝突しない(constraint 専用)
    });
    this.world.addBody(this.anchor);

    this.hud.setCredits(this.credits);
    this.hud.setScore(this.score);
    this.hud.setMessage(IDLE_MESSAGE);
  }

  update(dt: number): void {
    switch (this.phase) {
      case 'idle':
        this.updateIdle(dt);
        break;
      case 'descending':
        this.updateDescending(dt);
        break;
      case 'grabbing':
        this.updateGrabbing(dt);
        break;
      case 'lifting':
        this.updateLifting(dt);
        break;
      case 'carrying':
        this.updateCarrying(dt);
        break;
      case 'releasing':
        this.updateReleasing(dt);
        break;
      case 'gameover':
        break;
    }

    this.syncAnchor();
    this.claw.update(dt);
    this.checkCaptures();

    // クレーンが動いている間はモーター音を鳴らす
    const moving =
      this.phase === 'descending' ||
      this.phase === 'lifting' ||
      this.phase === 'carrying' ||
      (this.phase === 'idle' && (this.controls.moveX !== 0 || this.controls.moveZ !== 0));
    this.sfx.setMotor(moving);
  }

  private updateIdle(dt: number): void {
    this.claw.x = clamp(this.claw.x + this.controls.moveX * CLAW.moveSpeed * dt, CLAW.minX, CLAW.maxX);
    this.claw.z = clamp(this.claw.z + this.controls.moveZ * CLAW.moveSpeed * dt, CLAW.minZ, CLAW.maxZ);

    if (this.controls.consumeDescend()) {
      if (this.credits <= 0) {
        this.setPhase('gameover');
        return;
      }
      this.credits -= 1;
      this.hud.setCredits(this.credits);
      this.claw.setOpenTarget(1);
      this.sfx.coin();
      this.setPhase('descending');
    }
  }

  private updateDescending(dt: number): void {
    this.claw.y = Math.max(this.claw.y - CLAW.descendSpeed * dt, CLAW.bottomY);
    if (this.claw.y <= CLAW.bottomY) {
      this.grabTimer = 0;
      this.claw.setOpenTarget(0);
      this.setPhase('grabbing');
    }
  }

  private updateGrabbing(dt: number): void {
    this.grabTimer += dt;
    if (this.grabTimer >= 0.45) {
      this.attemptGrab();
      this.setPhase('lifting');
    }
  }

  private updateLifting(dt: number): void {
    this.claw.y = Math.min(this.claw.y + CLAW.liftSpeed * dt, CLAW.carryY);
    if (this.claw.y >= CLAW.carryY) {
      const dx = CLAW.homeX - this.claw.x;
      const dz = CLAW.homeZ - this.claw.z;
      this.carryStart = { x: this.claw.x, z: this.claw.z, dist: Math.max(Math.hypot(dx, dz), 1e-6) };
      this.setPhase('carrying');
    }
  }

  private updateCarrying(dt: number): void {
    const dx = CLAW.homeX - this.claw.x;
    const dz = CLAW.homeZ - this.claw.z;
    const dist = Math.hypot(dx, dz);

    // 「確率で意図的に落とす」— 運搬の途中で拘束を外す
    if (this.heldPrize && this.dropAtProgress !== null) {
      const progress = 1 - dist / this.carryStart.dist;
      if (progress >= this.dropAtProgress) {
        this.releaseHeldPrize();
        this.hud.setMessage('あーっ、落ちてしまった…');
        this.sfx.dropFail();
      }
    }

    const step = CLAW.moveSpeed * dt;
    if (dist <= step) {
      this.claw.x = CLAW.homeX;
      this.claw.z = CLAW.homeZ;
      this.releaseTimer = 0;
      this.claw.setOpenTarget(1);
      if (this.heldPrize) {
        this.hud.setMessage('落とし口へリリース！');
        this.sfx.release();
      }
      this.releaseHeldPrize();
      this.setPhase('releasing');
    } else {
      this.claw.x += (dx / dist) * step;
      this.claw.z += (dz / dist) * step;
    }
  }

  private updateReleasing(dt: number): void {
    this.releaseTimer += dt;
    this.claw.y = Math.min(this.claw.y + CLAW.liftSpeed * dt, CLAW.topY);
    if (this.releaseTimer >= 1.5) {
      if (this.credits <= 0) {
        this.setPhase('gameover');
      } else {
        this.setPhase('idle');
      }
    }
  }

  private setPhase(phase: GamePhase): void {
    this.phase = phase;
    switch (phase) {
      case 'idle':
        this.hud.setMessage(IDLE_MESSAGE);
        break;
      case 'descending':
        this.hud.setMessage('アーム降下中…');
        this.sfx.descend();
        break;
      case 'grabbing':
        this.hud.setMessage('キャッチ！');
        this.sfx.grab();
        break;
      case 'lifting':
        if (this.heldPrize) {
          this.hud.setMessage('持ち上げ中…うまく運べるか？');
          this.sfx.liftSuccess();
        } else {
          this.hud.setMessage('何も掴めなかった…');
          this.sfx.miss();
        }
        break;
      case 'gameover':
        this.hud.setMessage(`クレジットがなくなりました。最終スコア: ${this.score}点。リセットで再挑戦！`);
        this.sfx.gameover();
        break;
      default:
        break;
    }
  }

  /** 爪の真下にある景品を探し、あれば constraint で拘束する */
  private attemptGrab(): void {
    let best: PrizeEntity | null = null;
    let bestDist: number = CLAW.grabRadius;
    for (const prize of this.prizes) {
      if (prize.captured) continue;
      const dx = prize.body.position.x - this.claw.x;
      const dz = prize.body.position.z - this.claw.z;
      const dist = Math.hypot(dx, dz);
      if (dist < bestDist && prize.body.position.y < this.claw.y) {
        best = prize;
        bestDist = dist;
      }
    }
    if (!best) return;

    best.body.wakeUp();
    this.constraint = new CANNON.PointToPointConstraint(
      this.anchor,
      new CANNON.Vec3(0, -0.15, 0),
      best.body,
      new CANNON.Vec3(0, best.config.size.y * 0.3, 0),
      60
    );
    this.world.addConstraint(this.constraint);
    this.heldPrize = best;

    // 掴んだ瞬間に「途中で落とすかどうか」を確率で決めておく
    const dropChance = Math.min(
      DROP.maxChance,
      DROP.baseChance + best.config.score * DROP.perScore
    );
    this.dropAtProgress = Math.random() < dropChance ? 0.15 + Math.random() * 0.65 : null;
  }

  private releaseHeldPrize(): void {
    if (this.constraint) {
      this.world.removeConstraint(this.constraint);
      this.constraint = null;
    }
    if (this.heldPrize) {
      this.heldPrize.body.wakeUp();
      this.heldPrize = null;
    }
    this.dropAtProgress = null;
  }

  /** アンカーボディを爪の位置に追従させる */
  private syncAnchor(): void {
    this.anchor.position.set(this.claw.x, this.claw.y, this.claw.z);
    this.anchor.velocity.setZero();
  }

  /** 落とし口へ落ちた景品の獲得判定(どのフェーズでも毎フレーム行う) */
  private checkCaptures(): void {
    for (const prize of this.prizes) {
      if (prize.captured) continue;
      if (prize.body.position.y < CHUTE.captureY) {
        prize.captured = true;
        this.world.removeBody(prize.body);
        prize.mesh.removeFromParent();
        this.score += prize.config.score;
        this.hud.setScore(this.score);
        this.hud.setMessage(`🎉 景品ゲット！ +${prize.config.score}点`);
        this.sfx.capture();
      }
    }
  }
}
