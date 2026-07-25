// physics/prizes.ts — 景品の剛体生成と、対応するメッシュとの同期
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import type { PrizeConfig, StageConfig } from '../types';

export interface PrizeEntity {
  config: PrizeConfig;
  body: CANNON.Body;
  mesh: THREE.Object3D;
  captured: boolean;
}

const TYPE_COLORS: Record<string, number> = {
  plush_bear: 0xc98a4b,
  capsule_ball: 0x42a5f5,
  figure_box: 0xab47bc,
};

function createPrizeMesh(config: PrizeConfig): THREE.Object3D {
  const color = TYPE_COLORS[config.type] ?? 0x9e9e9e;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const group = new THREE.Group();

  if (config.type === 'capsule_ball') {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(config.size.x / 2, 24, 16), mat);
    ball.castShadow = true;
    group.add(ball);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(config.size.x / 2 + 0.001, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      capMat
    );
    cap.castShadow = true;
    group.add(cap);
  } else if (config.type === 'plush_bear') {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(config.size.x, config.size.y * 0.72, config.size.z),
      mat
    );
    body.position.y = -config.size.y * 0.14;
    body.castShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(config.size.x * 0.42, 20, 14), mat);
    head.position.y = config.size.y * 0.3;
    head.castShadow = true;
    group.add(head);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(config.size.x * 0.14, 12, 8), mat);
      ear.position.set(sx * config.size.x * 0.3, config.size.y * 0.48, 0);
      ear.castShadow = true;
      group.add(ear);
    }
  } else {
    const boxMesh = new THREE.Mesh(
      new THREE.BoxGeometry(config.size.x, config.size.y, config.size.z),
      mat
    );
    boxMesh.castShadow = true;
    group.add(boxMesh);
  }
  return group;
}

function createPrizeShape(config: PrizeConfig): CANNON.Shape {
  if (config.type === 'capsule_ball') {
    return new CANNON.Sphere(config.size.x / 2);
  }
  return new CANNON.Box(
    new CANNON.Vec3(config.size.x / 2, config.size.y / 2, config.size.z / 2)
  );
}

export function createPrizes(
  stage: StageConfig,
  world: CANNON.World,
  scene: THREE.Scene
): PrizeEntity[] {
  return stage.prizes.map((config) => {
    const body = new CANNON.Body({
      mass: config.mass,
      shape: createPrizeShape(config),
      position: new CANNON.Vec3(config.position.x, config.position.y, config.position.z),
      allowSleep: true,
      sleepSpeedLimit: 0.15,
      sleepTimeLimit: 0.6,
    });
    body.quaternion.setFromEuler(config.rotation.x, config.rotation.y, config.rotation.z);
    world.addBody(body);

    const mesh = createPrizeMesh(config);
    scene.add(mesh);

    return { config, body, mesh, captured: false };
  });
}

/** 物理ボディの位置・姿勢をメッシュへ反映する(毎フレーム呼ぶ) */
export function syncPrizeMeshes(prizes: PrizeEntity[]): void {
  for (const prize of prizes) {
    if (prize.captured) continue;
    const { position, quaternion } = prize.body;
    prize.mesh.position.set(position.x, position.y, position.z);
    prize.mesh.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  }
}
