// エントリポイント
// TODO(Phase 1): シーン(scene/)・物理ワールド(physics/)・入力(controls/)・
//                ゲーム状態(game/)を初期化し、レンダリングループを開始する
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = `
    <h1>Claw Machine App</h1>
    <p>プロジェクトセットアップ完了。ゲームロジックは Phase 1 以降で実装します。</p>
  `;
}
