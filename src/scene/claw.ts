// scene/claw.ts — クレーンアームの3Dモデルと開閉アニメーション
// レール(固定) + ガントリー梁(z移動) + トロリー(x移動) + ケーブル + 爪ヘッド(y移動)
import * as THREE from 'three';
import { FIELD, CLAW } from '../config/constants';

const FINGER_COUNT = 3;
const OPEN_ANGLE = 0.7; // 全開時に外へ開く角度(rad)
const CLOSED_ANGLE = -0.18; // 全閉時に内へ絞る角度(rad)
const OPEN_SPEED = 3; // 開閉スピード(openAmount/秒)

export class Claw {
  readonly group = new THREE.Group();

  /** ハブ(爪の付け根)のワールド座標 */
  x: number = CLAW.homeX;
  y: number = CLAW.topY;
  z: number = CLAW.homeZ;

  /** 0=全閉, 1=全開 */
  openAmount = 1;
  private openTarget = 1;

  /** 景品サイズに合わせた爪の倍率(ステージ開始時に設定) */
  sizeScale = 1;

  private readonly gantry: THREE.Mesh;
  private readonly trolley: THREE.Mesh;
  private readonly cable: THREE.Mesh;
  private readonly hanger = new THREE.Group();
  private readonly fingerPivots: THREE.Group[] = [];

  constructor() {
    const steel = new THREE.MeshStandardMaterial({
      color: 0x546e7a,
      metalness: 0.6,
      roughness: 0.35,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.5 });
    const claw = new THREE.MeshStandardMaterial({
      color: 0xffb300,
      metalness: 0.7,
      roughness: 0.3,
    });

    // 固定レール(左右)
    const railGeo = new THREE.BoxGeometry(0.04, 0.04, FIELD.depth + 0.1);
    for (const sx of [-1, 1]) {
      const rail = new THREE.Mesh(railGeo, steel);
      rail.position.set(sx * (FIELD.width / 2 + 0.02), CLAW.railY, 0);
      this.group.add(rail);
    }

    // ガントリー梁(z方向に移動)
    this.gantry = new THREE.Mesh(new THREE.BoxGeometry(FIELD.width + 0.16, 0.035, 0.05), steel);
    this.gantry.castShadow = true;
    this.group.add(this.gantry);

    // トロリー(梁の上をx方向に移動)
    this.trolley = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.09), dark);
    this.trolley.castShadow = true;
    this.group.add(this.trolley);

    // ケーブル(単位長のシリンダーをy方向スケールで伸縮)
    this.cable = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 8), dark);
    this.group.add(this.cable);

    // 爪ヘッド: ハブ + 3本の爪
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.06, 16), claw);
    hub.castShadow = true;
    this.hanger.add(hub);

    for (let i = 0; i < FINGER_COUNT; i++) {
      const root = new THREE.Group();
      root.rotation.y = (i * Math.PI * 2) / FINGER_COUNT;
      root.position.y = -0.02;

      const pivot = new THREE.Group();
      pivot.position.set(0.045, 0, 0);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.15, 0.03), claw);
      arm.position.y = -0.075;
      arm.castShadow = true;
      pivot.add(arm);

      const tipGroup = new THREE.Group();
      tipGroup.position.y = -0.15;
      tipGroup.rotation.z = -0.5; // 先端は内側へ曲げる
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.028), claw);
      tip.position.y = -0.03;
      tip.castShadow = true;
      tipGroup.add(tip);
      pivot.add(tipGroup);

      this.fingerPivots.push(pivot);
      root.add(pivot);
      this.hanger.add(root);
    }
    this.group.add(this.hanger);

    this.syncMeshes();
  }

  /** 爪先(把持判定の基準点)のy座標 */
  get tipY(): number {
    return this.y - 0.2 * this.sizeScale;
  }

  /** 爪ヘッド(ハブ+指)を景品サイズに合わせて拡大縮小する */
  setSizeScale(scale: number): void {
    this.sizeScale = scale;
    this.hanger.scale.setScalar(scale);
  }

  setOpenTarget(v: number): void {
    this.openTarget = Math.min(1, Math.max(0, v));
  }

  update(dt: number): void {
    const delta = this.openTarget - this.openAmount;
    const maxStep = OPEN_SPEED * dt;
    this.openAmount += Math.min(maxStep, Math.max(-maxStep, delta));
    this.syncMeshes();
  }

  private syncMeshes(): void {
    const angle = CLOSED_ANGLE + (OPEN_ANGLE - CLOSED_ANGLE) * this.openAmount;
    for (const pivot of this.fingerPivots) {
      pivot.rotation.z = angle;
    }

    this.gantry.position.set(0, CLAW.railY, this.z);
    this.trolley.position.set(this.x, CLAW.railY + 0.01, this.z);
    this.hanger.position.set(this.x, this.y, this.z);

    const cableLen = Math.max(0.01, CLAW.railY - 0.02 - this.y);
    this.cable.scale.y = cableLen;
    this.cable.position.set(this.x, this.y + cableLen / 2, this.z);
  }
}
