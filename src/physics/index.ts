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
  // すり抜け対策: 反復回数を増やして接触解決の精度を上げる
  (world.solver as CANNON.GSSolver).iterations = 20;

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

  // ---- 落とし口の縁の仕切り壁(内側の面は見た目と揃え、厚みを外側へ持たせる) ----
  const chuteW = CHUTE.maxX - CHUTE.minX;
  const chuteD = CHUTE.maxZ - CHUTE.minZ;
  const guardHalfT = 0.03;
  addStaticBox(
    world,
    [guardHalfT, CHUTE.guardHeight / 2, chuteD / 2],
    [CHUTE.maxX + guardHalfT, CHUTE.guardHeight / 2, (CHUTE.minZ + CHUTE.maxZ) / 2]
  );
  addStaticBox(
    world,
    [chuteW / 2, CHUTE.guardHeight / 2, guardHalfT],
    [(CHUTE.minX + CHUTE.maxX) / 2, CHUTE.guardHeight / 2, CHUTE.minZ - guardHalfT]
  );

  // ---- 外周のガラス壁(すり抜け防止のため厚めにし、上方向にも余裕を持たせる) ----
  const wallHalfT = 0.08;
  const wallHalfH = FIELD.wallHeight / 2 + 0.15;
  addStaticBox(world, [halfW + wallHalfT * 2, wallHalfH, wallHalfT], [0, wallHalfH, halfD + wallHalfT]);
  addStaticBox(world, [halfW + wallHalfT * 2, wallHalfH, wallHalfT], [0, wallHalfH, -halfD - wallHalfT]);
  addStaticBox(world, [wallHalfT, wallHalfH, halfD + wallHalfT * 2], [halfW + wallHalfT, wallHalfH, 0]);
  addStaticBox(world, [wallHalfT, wallHalfH, halfD + wallHalfT * 2], [-halfW - wallHalfT, wallHalfH, 0]);

  // ---- 落とし口シャフトの壁(厚みを穴の外側へ持たせて、まっすぐ下へ落とす) ----
  const shaftHalfH = 0.25;
  const shaftHalfT = 0.04;
  addStaticBox(
    world,
    [chuteW / 2 + shaftHalfT * 2, shaftHalfH, shaftHalfT],
    [(CHUTE.minX + CHUTE.maxX) / 2, -shaftHalfH, CHUTE.minZ - shaftHalfT]
  );
  addStaticBox(
    world,
    [chuteW / 2 + shaftHalfT * 2, shaftHalfH, shaftHalfT],
    [(CHUTE.minX + CHUTE.maxX) / 2, -shaftHalfH, CHUTE.maxZ + shaftHalfT]
  );
  addStaticBox(
    world,
    [shaftHalfT, shaftHalfH, chuteD / 2 + shaftHalfT * 2],
    [CHUTE.minX - shaftHalfT, -shaftHalfH, (CHUTE.minZ + CHUTE.maxZ) / 2]
  );
  addStaticBox(
    world,
    [shaftHalfT, shaftHalfH, chuteD / 2 + shaftHalfT * 2],
    [CHUTE.maxX + shaftHalfT, -shaftHalfH, (CHUTE.minZ + CHUTE.maxZ) / 2]
  );

  return world;
}
