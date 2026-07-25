import { defineConfig } from 'vite';

// 本番ビルド時のみ GitHub Pages 用のサブパスを base にする。
// 開発サーバー(dev)では '/' のままにして localhost で素直に開けるようにする。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/claw-machine-app/' : '/',
  build: {
    rollupOptions: {
      output: {
        // 大きなライブラリはアプリ本体と分けてキャッシュ効率を上げる
        // (Vite 8 / rolldown ではオブジェクト形式が使えないため関数形式)
        manualChunks: (id: string) => {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/cannon-es')) return 'physics';
          return undefined;
        },
      },
    },
  },
}));
