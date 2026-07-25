// physics/prizes.ts — 景品の剛体生成と、メッシュ(GLBモデル or プリミティブ)の構築・同期
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PrizeConfig, StageConfig } from '../types';

export interface PrizeEntity {
  config: PrizeConfig;
  body: CANNON.Body;
  mesh: THREE.Object3D;
  captured: boolean;
}

const SKIN_COLOR = '#ffe0bd';
const RING_COLOR = '#ffd700';

// ---- GLBモデルの読み込み(種類ごとに1回だけロードしてキャッシュ) ----
const gltfLoader = new GLTFLoader();
const modelCache = new Map<string, Promise<THREE.Group>>();

/**
 * スキンメッシュ(ボーン入り)を静的メッシュに置き換える。
 * 景品はアニメーションしないため、バインドポーズのジオメトリをそのまま使えばよい。
 * (SkinnedMesh のままだとスケルトン複製やスケールの扱いが壊れやすく、描画されない事故が起きる)
 */
function stripSkinning(root: THREE.Object3D): void {
  const skinned: THREE.SkinnedMesh[] = [];
  root.traverse((obj) => {
    if (obj instanceof THREE.SkinnedMesh) skinned.push(obj);
  });
  for (const mesh of skinned) {
    const parent = mesh.parent;
    if (!parent) continue;
    const staticMesh = new THREE.Mesh(mesh.geometry, mesh.material);
    staticMesh.position.copy(mesh.position);
    staticMesh.quaternion.copy(mesh.quaternion);
    staticMesh.scale.copy(mesh.scale);
    parent.add(staticMesh);
    parent.remove(mesh);
  }
}

function loadModel(file: string): Promise<THREE.Group> {
  let promise = modelCache.get(file);
  if (!promise) {
    const url = `${import.meta.env.BASE_URL}models/${file}`;
    promise = gltfLoader.loadAsync(url).then((gltf) => {
      stripSkinning(gltf.scene);
      return gltf.scene;
    });
    modelCache.set(file, promise);
  }
  return promise;
}

/** 読み込んだモデルを config.size に収まるよう等倍スケールし、中心を原点に合わせる */
function fitModelToSize(instance: THREE.Group, config: PrizeConfig): void {
  const box = new THREE.Box3().setFromObject(instance);
  const size = box.getSize(new THREE.Vector3());
  const scale = Math.min(
    config.size.x / Math.max(size.x, 1e-6),
    config.size.y / Math.max(size.y, 1e-6),
    config.size.z / Math.max(size.z, 1e-6)
  );
  instance.scale.setScalar(scale);
  box.setFromObject(instance);
  const center = box.getCenter(new THREE.Vector3());
  instance.position.sub(center);
  // 縦横比の違いでモデルが判定ボックスより小さくなった場合、
  // 中央寄せのままだと接地時に浮いて見えるので、足元を判定ボックスの底面に揃える
  box.setFromObject(instance);
  instance.position.y += -config.size.y / 2 - box.min.y;
  instance.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
    }
  });
}

function createPrizeMesh(config: PrizeConfig): THREE.Object3D {
  // GLBモデル指定があれば非同期で読み込み、失敗時はプリミティブ造形にフォールバック
  if (config.model) {
    const group = new THREE.Group();
    loadModel(config.model)
      .then((scene) => {
        const instance = scene.clone(true);
        fitModelToSize(instance, config);
        group.add(instance);
      })
      .catch((err) => {
        console.warn(`モデル ${config.model} の読み込みに失敗。プリミティブで表示します`, err);
        group.add(createProceduralMesh(config));
      });
    return group;
  }
  return createProceduralMesh(config);
}

function createProceduralMesh(config: PrizeConfig): THREE.Object3D {
  const primary = new THREE.MeshStandardMaterial({ color: config.colors.primary, roughness: 0.8 });
  const secondary = new THREE.MeshStandardMaterial({
    color: config.colors.secondary ?? '#ffffff',
    roughness: 0.8,
  });
  const { x: sx, y: sy, z: sz } = config.size;
  const group = new THREE.Group();
  const add = (mesh: THREE.Mesh): void => {
    mesh.castShadow = true;
    group.add(mesh);
  };

  switch (config.archetype) {
    case 'ball': {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(sx / 2, 24, 16), primary);
      add(ball);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(sx / 2 + 0.001, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        secondary
      );
      add(cap);
      break;
    }
    case 'plush_bear': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(sx, sy * 0.7, sz), primary);
      body.position.y = -sy * 0.14;
      add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(sx * 0.42, 20, 14), primary);
      head.position.y = sy * 0.28;
      add(head);
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(sx * 0.14, 12, 8), secondary);
        ear.position.set(side * sx * 0.3, sy * 0.46, 0);
        add(ear);
      }
      break;
    }
    case 'plush_rabbit': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(sx, sy * 0.55, sz), primary);
      body.position.y = -sy * 0.2;
      add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(sx * 0.4, 20, 14), primary);
      head.position.y = sy * 0.12;
      add(head);
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(sx * 0.13, 12, 8), secondary);
        ear.scale.y = 2.6;
        ear.position.set(side * sx * 0.18, sy * 0.4, 0);
        add(ear);
      }
      break;
    }
    case 'plush_round': {
      const body = new THREE.Mesh(new THREE.SphereGeometry(sy / 2, 24, 16), primary);
      body.scale.set(sx / sy, 1, sz / sy);
      add(body);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(sy * 0.34, 20, 14), secondary);
      belly.position.set(0, -sy * 0.06, sz * 0.22);
      add(belly);
      break;
    }
    case 'figure': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(sx, sy * 0.12, sz), secondary);
      base.position.y = -sy * 0.44;
      add(base);
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(sx * 0.22, sx * 0.3, sy * 0.6, 12),
        primary
      );
      body.position.y = -sy * 0.06;
      add(body);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(sx * 0.28, 16, 12),
        new THREE.MeshStandardMaterial({ color: SKIN_COLOR, roughness: 0.7 })
      );
      head.position.y = sy * 0.34;
      add(head);
      break;
    }
    case 'keychain': {
      const charm = new THREE.Mesh(new THREE.SphereGeometry(sx / 2, 16, 12), primary);
      charm.position.y = -sy * 0.12;
      add(charm);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(sx * 0.24, sx * 0.05, 8, 20),
        new THREE.MeshStandardMaterial({ color: RING_COLOR, metalness: 0.8, roughness: 0.3 })
      );
      ring.position.y = sy * 0.3;
      add(ring);
      break;
    }
    case 'flatbox': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), primary);
      add(body);
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(sx + 0.002, sy + 0.002, sz * 0.3),
        secondary
      );
      add(stripe);
      break;
    }
    case 'box':
    default: {
      const body = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), primary);
      add(body);
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(sx + 0.002, sy * 0.25, sz + 0.002),
        secondary
      );
      add(band);
      break;
    }
  }
  return group;
}

function createPrizeShape(config: PrizeConfig): CANNON.Shape {
  if (config.archetype === 'ball' || config.archetype === 'keychain') {
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
