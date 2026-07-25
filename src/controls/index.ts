// controls/ — アーム操作(前後・左右・降下)の入力処理
// キーボード(矢印 / WASD / スペース)と画面上のボタンUI(タッチ対応)の両方を受け付ける

type Direction = 'left' | 'right' | 'forward' | 'back';

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'back', // 奥(-z)へ
  KeyW: 'back',
  ArrowDown: 'forward', // 手前(+z)へ
  KeyS: 'forward',
};

export class Controls {
  private readonly pressed = new Set<Direction>();
  private descendQueued = false;

  constructor(uiRoot: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      const dir = KEY_TO_DIRECTION[e.code];
      if (dir) {
        e.preventDefault();
        this.pressed.add(dir);
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!e.repeat) this.descendQueued = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      const dir = KEY_TO_DIRECTION[e.code];
      if (dir) this.pressed.delete(dir);
    });
    this.buildButtons(uiRoot);
  }

  /** 左右: -1(左)〜+1(右) */
  get moveX(): number {
    return (this.pressed.has('right') ? 1 : 0) - (this.pressed.has('left') ? 1 : 0);
  }

  /** 前後: -1(奥)〜+1(手前) */
  get moveZ(): number {
    return (this.pressed.has('forward') ? 1 : 0) - (this.pressed.has('back') ? 1 : 0);
  }

  /** 降下要求を1回分取り出す(エッジトリガー) */
  consumeDescend(): boolean {
    const queued = this.descendQueued;
    this.descendQueued = false;
    return queued;
  }

  private buildButtons(uiRoot: HTMLElement): void {
    const container = document.createElement('div');
    container.id = 'controls-ui';

    const dpad = document.createElement('div');
    dpad.className = 'dpad';
    const buttons: Array<{ label: string; dir: Direction; cls: string }> = [
      { label: '▲', dir: 'back', cls: 'up' },
      { label: '◀', dir: 'left', cls: 'left' },
      { label: '▶', dir: 'right', cls: 'right' },
      { label: '▼', dir: 'forward', cls: 'down' },
    ];
    for (const { label, dir, cls } of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `dpad-btn ${cls}`;
      btn.textContent = label;
      const press = (e: Event) => {
        e.preventDefault();
        this.pressed.add(dir);
      };
      const release = () => this.pressed.delete(dir);
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('pointercancel', release);
      dpad.appendChild(btn);
    }
    container.appendChild(dpad);

    const descendBtn = document.createElement('button');
    descendBtn.type = 'button';
    descendBtn.id = 'descend-btn';
    descendBtn.textContent = '降下';
    descendBtn.addEventListener('click', () => {
      this.descendQueued = true;
    });
    container.appendChild(descendBtn);

    uiRoot.appendChild(container);
  }
}
