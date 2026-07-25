// scene/machine.ts — クレーンゲーム筐体の3Dモデル(見た目のみ。当たり判定は physics/ 側)
import * as THREE from 'three';
import { FIELD, CHUTE } from '../config/constants';

const CABINET_COLOR = 0xe91e63;
const FRAME_COLOR = 0x37474f;
const CARPET_COLOR = 0xd32f2f;

function box(
  w: number,
  h: number,
  d: number,
  color: number,
  opts: { receiveShadow?: boolean; castShadow?: boolean } = {}
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
  );
  mesh.receiveShadow = opts.receiveShadow ?? false;
  mesh.castShadow = opts.castShadow ?? false;
  return mesh;
}

export function createMachine(): THREE.Group {
  const group = new THREE.Group();
  const halfW = FIELD.width / 2;
  const halfD = FIELD.depth / 2;
  const wallH = FIELD.wallHeight;

  // ---- 床(落とし口の穴を避けた2枚。physics/index.ts と同じ分割) ----
  const floorBack = box(FIELD.width, FIELD.floorThickness, CHUTE.minZ + halfD, CARPET_COLOR, {
    receiveShadow: true,
  });
  floorBack.position.set(0, -FIELD.floorThickness / 2, (CHUTE.minZ - halfD) / 2);
  group.add(floorBack);

  const floorFront = box(halfW - CHUTE.maxX, FIELD.floorThickness, halfD - CHUTE.minZ, CARPET_COLOR, {
    receiveShadow: true,
  });
  floorFront.position.set(
    (CHUTE.maxX + halfW) / 2,
    -FIELD.floorThickness / 2,
    (CHUTE.minZ + halfD) / 2
  );
  group.add(floorFront);

  // ---- 落とし口の縁の仕切り壁 ----
  const chuteW = CHUTE.maxX - CHUTE.minX;
  const chuteD = CHUTE.maxZ - CHUTE.minZ;
  const guardRight = box(0.02, CHUTE.guardHeight, chuteD, 0xf06292, { castShadow: true });
  guardRight.position.set(CHUTE.maxX + 0.01, CHUTE.guardHeight / 2, (CHUTE.minZ + CHUTE.maxZ) / 2);
  group.add(guardRight);

  const guardBack = box(chuteW, CHUTE.guardHeight, 0.02, 0xf06292, { castShadow: true });
  guardBack.position.set((CHUTE.minX + CHUTE.maxX) / 2, CHUTE.guardHeight / 2, CHUTE.minZ - 0.01);
  group.add(guardBack);

  // ---- 落とし口のシャフト(穴の下の暗い筒) ----
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });
  const shaftDepth = 0.5;
  const shaftWalls: Array<[number, number, number, number, number]> = [
    // [w, d, x, z, 回転しないので幅と奥行きで指定]
    [chuteW, 0.01, (CHUTE.minX + CHUTE.maxX) / 2, CHUTE.minZ + 0.005, 0],
    [chuteW, 0.01, (CHUTE.minX + CHUTE.maxX) / 2, CHUTE.maxZ - 0.005, 0],
    [0.01, chuteD, CHUTE.minX + 0.005, (CHUTE.minZ + CHUTE.maxZ) / 2, 0],
    [0.01, chuteD, CHUTE.maxX - 0.005, (CHUTE.minZ + CHUTE.maxZ) / 2, 0],
  ];
  for (const [w, d, x, z] of shaftWalls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, shaftDepth, d), shaftMat);
    wall.position.set(x, -shaftDepth / 2, z);
    group.add(wall);
  }
  const shaftBottom = new THREE.Mesh(new THREE.BoxGeometry(chuteW, 0.01, chuteD), shaftMat);
  shaftBottom.position.set((CHUTE.minX + CHUTE.maxX) / 2, -shaftDepth, (CHUTE.minZ + CHUTE.maxZ) / 2);
  group.add(shaftBottom);

  // ---- 筐体の土台(スカートパネル) ----
  const skirtH = 0.75;
  const skirtY = -skirtH / 2 - FIELD.floorThickness;
  for (const [w, d, x, z] of [
    [FIELD.width + 0.12, 0.03, 0, halfD + 0.045],
    [FIELD.width + 0.12, 0.03, 0, -halfD - 0.045],
    [0.03, FIELD.depth + 0.12, halfW + 0.045, 0],
    [0.03, FIELD.depth + 0.12, -halfW - 0.045, 0],
  ] as const) {
    const panel = box(w, skirtH, d, CABINET_COLOR, { castShadow: true });
    panel.position.set(x, skirtY, z);
    group.add(panel);
  }

  // ---- コーナー支柱と上部フレーム ----
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pillar = box(0.05, wallH + 0.25, 0.05, FRAME_COLOR, { castShadow: true });
      pillar.position.set(sx * (halfW + 0.045), (wallH + 0.25) / 2, sz * (halfD + 0.045));
      group.add(pillar);
    }
  }
  for (const [w, d, x, z] of [
    [FIELD.width + 0.14, 0.05, 0, halfD + 0.045],
    [FIELD.width + 0.14, 0.05, 0, -halfD - 0.045],
    [0.05, FIELD.depth + 0.14, halfW + 0.045, 0],
    [0.05, FIELD.depth + 0.14, -halfW - 0.045, 0],
  ] as const) {
    const bar = box(w, 0.05, d, FRAME_COLOR);
    bar.position.set(x, wallH + 0.22, z);
    group.add(bar);
  }

  // ---- ガラス壁(見た目のみ。物理壁は physics/ 側) ----
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbbdefb,
    transparent: true,
    opacity: 0.12,
    roughness: 0.05,
    metalness: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glassSpecs: Array<{ w: number; h: number; x: number; z: number; rotY: number }> = [
    { w: FIELD.width, h: wallH, x: 0, z: halfD, rotY: 0 },
    { w: FIELD.width, h: wallH, x: 0, z: -halfD, rotY: 0 },
    { w: FIELD.depth, h: wallH, x: halfW, z: 0, rotY: Math.PI / 2 },
    { w: FIELD.depth, h: wallH, x: -halfW, z: 0, rotY: Math.PI / 2 },
  ];
  for (const spec of glassSpecs) {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, spec.h), glassMat);
    glass.position.set(spec.x, wallH / 2, spec.z);
    glass.rotation.y = spec.rotY;
    group.add(glass);
  }

  // ---- 周囲の床 ----
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(6, 48),
    new THREE.MeshStandardMaterial({ color: 0x23233a, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -skirtH - FIELD.floorThickness;
  ground.receiveShadow = true;
  group.add(ground);

  return group;
}
