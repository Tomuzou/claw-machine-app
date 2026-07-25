// physics/ — cannon-es のワールド初期化と筐体の静的ボディ
import * as CANNON from 'cannon-es';
import { FIELD, CHUTE } from '../config/constants';

function addStaticBox(
  world: CANNON.World,
  halfExtents: [number, number, number],
  position: [number, number, number]
): void {
  const body = new CANNON.Body({ type: CANNON.Body.STATIC });
  body.addShape(new CANNON.Box(new CANNON.Vec3(...halfExtents)));
  body.position.set(...position);
  world.addBody(body);
}

export function createPhysicsWorld(): CANNON.World {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.4;
  world.defaultContactMaterial.restitution = 0.15;

  const halfW = FIELD.width / 2;
  const halfD = FIELD.depth / 2;
  const halfT = FIELD.floorThickness / 2;

  // ---- 床(落とし口の穴を避けた2枚。scene/machine.ts と同じ分割) ----
  // 奥側: x全域, z: [-halfD, CHUTE.minZ]
  addStaticBox(
    world,
    [halfW, halfT, (CHUTE.minZ + halfD) / 2],
    [0, -halfT, (CHUTE.minZ - halfD) / 2]
  );
  // 手前右側: x: [CHUTE.maxX, halfW], z: [CHUTE.minZ, halfD]
  addStaticBox(
    world,
    [(halfW - CHUTE.maxX) / 2, halfT, (halfD - CHUTE.minZ) / 2],
    [(CHUTE.maxX + halfW) / 2, -halfT, (CHUTE.minZ + halfD) / 2]
  );

  // ---- 落とし口の縁の仕切り壁 ----
  const chuteW = CHUTE.maxX - CHUTE.minX;
  const chuteD = CHUTE.maxZ - CHUTE.minZ;
  addStaticBox(
    world,
    [0.01, CHUTE.guardHeight / 2, chuteD / 2],
    [CHUTE.maxX + 0.01, CHUTE.guardHeight / 2, (CHUTE.minZ + CHUTE.maxZ) / 2]
  );
  addStaticBox(
    world,
    [chuteW / 2, CHUTE.guardHeight / 2, 0.01],
    [(CHUTE.minX + CHUTE.maxX) / 2, CHUTE.guardHeight / 2, CHUTE.minZ - 0.01]
  );

  // ---- 外周のガラス壁(景品が外へ出ないように) ----
  const wallHalfH = FIELD.wallHeight / 2;
  addStaticBox(world, [halfW, wallHalfH, 0.015], [0, wallHalfH, halfD + 0.015]);
  addStaticBox(world, [halfW, wallHalfH, 0.015], [0, wallHalfH, -halfD - 0.015]);
  addStaticBox(world, [0.015, wallHalfH, halfD], [halfW + 0.015, wallHalfH, 0]);
  addStaticBox(world, [0.015, wallHalfH, halfD], [-halfW - 0.015, wallHalfH, 0]);

  // ---- 落とし口シャフトの壁(まっすぐ下へ落とす) ----
  const shaftHalfH = 0.25;
  addStaticBox(
    world,
    [chuteW / 2, shaftHalfH, 0.01],
    [(CHUTE.minX + CHUTE.maxX) / 2, -shaftHalfH, CHUTE.minZ + 0.005]
  );
  addStaticBox(
    world,
    [chuteW / 2, shaftHalfH, 0.01],
    [(CHUTE.minX + CHUTE.maxX) / 2, -shaftHalfH, CHUTE.maxZ - 0.005]
  );
  addStaticBox(
    world,
    [0.01, shaftHalfH, chuteD / 2],
    [CHUTE.minX + 0.005, -shaftHalfH, (CHUTE.minZ + CHUTE.maxZ) / 2]
  );
  addStaticBox(
    world,
    [0.01, shaftHalfH, chuteD / 2],
    [CHUTE.maxX - 0.005, -shaftHalfH, (CHUTE.minZ + CHUTE.maxZ) / 2]
  );

  return world;
}
