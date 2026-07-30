// game/ — ゲーム状態管理(状態機械・把持判定・スコアとクレジット)
import * as CANNON from 'cannon-es';
import { CLAW, CHUTE, GRAB, SLIP, TURN } from '../config/constants';
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

const IDLE_MESSAGE =
  '移動: 矢印キー / ボタン　降下: スペース / ボタン(1クレジット)　時間切れで自動降下！';

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

  /** 現在の把持のグリップ品質(0〜1)。低いほど滑りやすく、拘束も弱い */
  private grip = 0;
  private grabTimer = 0;
  private releaseTimer = 0;

  /** 待機フェーズの残り時間(秒)。0で自動降下 */
  private turnTimer: number = TURN.timeLimit;
  private lastShownSeconds: number | null = null;

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

    // 制限時間のカウントダウン。0になったらその場で自動降下
    this.turnTimer -= dt;
    const seconds = Math.max(0, Math.ceil(this.turnTimer));
    if (seconds !== this.lastShownSeconds) {
      this.lastShownSeconds = seconds;
      this.hud.setTimer(seconds, seconds <= TURN.warnAt);
      if (seconds > 0 && seconds <= TURN.warnAt) this.sfx.tick();
    }

    if (this.controls.consumeDescend() || this.turnTimer <= 0) {
      this.startDescend();
    }
  }

  private startDescend(): void {
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

  private updateDescending(dt: number): void {
    // 爪が大きいほど先端が長いので、降下の下限も爪のスケールに合わせる
    const bottomY = CLAW.bottomY * this.claw.sizeScale;
    this.claw.y = Math.max(this.claw.y - CLAW.descendSpeed * dt, bottomY);
    if (this.claw.y <= bottomY) {
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

  /** 掴んでいる景品の重さに応じた速度低下(重量感の演出) */
  private heldMassFactor(coef: number): number {
    const mass = this.heldPrize ? this.heldPrize.config.mass : 0;
    return 1 / (1 + mass * coef);
  }

  /**
   * 毎フレームの連続滑り判定。
   * グリップが弱い・高得点・揺れが大きいほど滑り落ちやすい。
   */
  private updateHeldSlip(dt: number): void {
    if (!this.heldPrize) return;
    const v = this.heldPrize.body.velocity;
    const swing = Math.min(Math.hypot(v.x, v.z), 2);
    const rate =
      SLIP.baseRate *
      (1 - this.grip) ** 2 *
      (1 + this.heldPrize.config.score * SLIP.scoreFactor) *
      (1 + swing * SLIP.swingFactor);
    if (Math.random() < rate * dt) {
      this.releaseHeldPrize();
      this.hud.setMessage('あーっ、滑り落ちてしまった…');
      this.sfx.dropFail();
    }
  }

  private updateLifting(dt: number): void {
    // 重い景品ほどゆっくり持ち上がる
    this.claw.y = Math.min(this.claw.y + CLAW.liftSpeed * this.heldMassFactor(0.9) * dt, CLAW.carryY);
    this.updateHeldSlip(dt);
    if (this.claw.y >= CLAW.carryY) {
      this.setPhase('carrying');
    }
  }

  private updateCarrying(dt: number): void {
    const dx = CLAW.homeX - this.claw.x;
    const dz = CLAW.homeZ - this.claw.z;
    const dist = Math.hypot(dx, dz);

    this.updateHeldSlip(dt);

    // 重い景品ほど運搬もゆっくり(揺れも増えて滑りやすくなる)
    const step = CLAW.moveSpeed * this.heldMassFactor(0.5) * dt;
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
    if (phase === 'idle') {
      // 新しいターン開始: 制限時間をリセット
      this.turnTimer = TURN.timeLimit;
      this.lastShownSeconds = null;
    } else {
      this.hud.setTimer(null);
    }
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
          this.hud.setMessage(
            this.grip < 0.4 ? '掴みが浅い…！落ちるな落ちるな…' : '持ち上げ中…うまく運べるか？'
          );
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

  /**
   * 爪の真下にある景品を探し、グリップ品質を計算して拘束する。
   * - 判定半径は狭め(爪の真下にほぼ重ねる必要あり)
   * - 中心からのズレ・質量・サイズでグリップ品質(0〜1)が決まる
   * - グリップが低いと: そもそも掴めない / 拘束が弱く垂れ下がる / 滑りやすい
   */
  private attemptGrab(): void {
    // 判定半径・サイズペナルティは爪の大きさに比例する
    const grabRadius = GRAB.radius * this.claw.sizeScale;
    let best: PrizeEntity | null = null;
    let bestDist: number = grabRadius;
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

    // グリップ品質 = 中心ズレ × 質量 × サイズ の複合
    const offsetFactor = 0.4 + 0.6 * (1 - bestDist / grabRadius); // 中心ほど良い
    const massFactor = 1 / (1 + best.config.mass * GRAB.massPenalty); // 重いほど悪い
    const maxDim = Math.max(best.config.size.x, best.config.size.z);
    // 爪が大きいほど大きな景品もしっかり掴める
    const sizeFactor = clamp(1.2 - maxDim / (GRAB.sizePenaltyDiv * this.claw.sizeScale), 0.35, 1);
    this.grip = clamp(offsetFactor * massFactor * sizeFactor, 0, 1);

    // 爪を閉じた瞬間の把持成功判定(グリップが低いとそもそも持ち上がらない)
    if (Math.random() > GRAB.instantSuccessBase + this.grip * 0.9) {
      this.grip = 0;
      return;
    }

    best.body.wakeUp();
    // 掴んだ位置(爪の真下)に拘束点を置く: 中心を外して掴むと傾いてぶら下がる
    const gripWorld = new CANNON.Vec3(
      this.claw.x,
      best.body.position.y + best.config.size.y * 0.35,
      this.claw.z
    );
    const pivotInPrize = best.body.pointToLocalFrame(gripWorld);
    // 拘束の強さもグリップ依存: 弱いと重い景品は垂れ下がり、揺れで振り回される
    const maxForce = 8 + this.grip * 50;
    this.constraint = new CANNON.PointToPointConstraint(
      this.anchor,
      new CANNON.Vec3(0, -0.15 * this.claw.sizeScale, 0),
      best.body,
      pivotInPrize,
      maxForce
    );
    this.world.addConstraint(this.constraint);
    this.heldPrize = best;
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
    this.grip = 0;
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
