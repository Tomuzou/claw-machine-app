// physics/clawBody.ts — アーム(爪)の物理コライダー
// ハブ+指6本分のキネマティックボディを毎フレーム爪メッシュに追従させ、
// 降下・移動時に景品を実際に押しのけられるようにする(すり抜け防止)
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import type { Claw } from '../scene/claw';

/** 爪ボディの衝突グループ。把持中の景品はこのグループとの衝突を除外する */
export const CLAW_COLLISION_GROUP = 2;
/** すべてと衝突するデフォルトマスク */
export const MASK_ALL = -1;
/** 爪とだけ衝突しないマスク(把持中・リリース直後の景品用) */
export const MASK_NO_CLAW = ~CLAW_COLLISION_GROUP;

export class ClawCollider {
  private readonly claw: Claw;
  private readonly hubBody: CANNON.Body;
  private readonly fingerBodies: CANNON.Body[] = [];
  private readonly fingerMeshes: THREE.Mesh[] = [];
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();

  constructor(world: CANNON.World, claw: Claw) {
    this.claw = claw;
    const s = claw.sizeScale;

    const makeKinematic = (shape: CANNON.Shape): CANNON.Body => {
      const body = new CANNON.Body({
        type: CANNON.Body.KINEMATIC,
        collisionFilterGroup: CLAW_COLLISION_GROUP,
      });
      body.addShape(shape);
      world.addBody(body);
      return body;
    };

    this.hubBody = makeKinematic(new CANNON.Sphere(0.06 * s));

    // 指の腕部分(BoxGeometry 0.022 x 0.15 x 0.03 のハーフサイズ × スケール)
    for (const arm of claw.fingerArms) {
      this.fingerMeshes.push(arm);
      this.fingerBodies.push(
        makeKinematic(new CANNON.Box(new CANNON.Vec3(0.011 * s, 0.075 * s, 0.015 * s)))
      );
    }
    // 指の先端部分(BoxGeometry 0.02 x 0.07 x 0.028)
    for (const tip of claw.fingerTips) {
      this.fingerMeshes.push(tip);
      this.fingerBodies.push(
        makeKinematic(new CANNON.Box(new CANNON.Vec3(0.01 * s, 0.035 * s, 0.014 * s)))
      );
    }
  }

  /** 爪メッシュのワールド変換を物理ボディへ反映する(毎フレーム、claw.update の後に呼ぶ) */
  update(): void {
    this.hubBody.position.set(this.claw.x, this.claw.y, this.claw.z);
    this.claw.group.updateMatrixWorld(true);
    for (let i = 0; i < this.fingerMeshes.length; i++) {
      const mesh = this.fingerMeshes[i];
      const body = this.fingerBodies[i];
      mesh.getWorldPosition(this.tmpPos);
      mesh.getWorldQuaternion(this.tmpQuat);
      body.position.set(this.tmpPos.x, this.tmpPos.y, this.tmpPos.z);
      body.quaternion.set(this.tmpQuat.x, this.tmpQuat.y, this.tmpQuat.z, this.tmpQuat.w);
      body.velocity.setZero();
      body.angularVelocity.setZero();
    }
  }
}
