// scene/ — レンダラー・カメラ・ライトの初期化とカメラ操作(OrbitControls)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0.75, 1.2, 1.85);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0.3, 0);

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cameraControls: OrbitControls;
  /** カメラを初期視点に戻す */
  resetCamera: () => void;
}

export function createScene(container: HTMLElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.copy(DEFAULT_CAMERA_POSITION);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // マウスドラッグ / ホイール / タッチでの視点変更
  const cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.target.copy(DEFAULT_CAMERA_TARGET);
  cameraControls.enableDamping = true;
  cameraControls.dampingFactor = 0.08;
  cameraControls.minDistance = 0.6;
  cameraControls.maxDistance = 5;
  cameraControls.minPolarAngle = 0.1;
  cameraControls.maxPolarAngle = Math.PI * 0.49; // 地面より下へは回り込めない
  cameraControls.update();

  const resetCamera = (): void => {
    camera.position.copy(DEFAULT_CAMERA_POSITION);
    cameraControls.target.copy(DEFAULT_CAMERA_TARGET);
    cameraControls.update();
  };

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.6);
  sun.position.set(1.6, 3, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -1.5;
  sun.shadow.camera.right = 1.5;
  sun.shadow.camera.top = 1.5;
  sun.shadow.camera.bottom = -1.5;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xa0c4ff, 0.4);
  fill.position.set(-1.5, 1.5, -1);
  scene.add(fill);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, cameraControls, resetCamera };
}
