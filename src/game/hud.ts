// game/hud.ts — クレジット・スコア・メッセージの表示と補助ボタン
export interface HudCallbacks {
  /** 視点リセットボタン */
  onCameraReset: () => void;
  /** ミュート切り替え。新しい状態(true=ミュート中)を返す */
  onToggleMute: () => boolean;
}

export class Hud {
  private readonly creditEl: HTMLSpanElement;
  private readonly scoreEl: HTMLSpanElement;
  private readonly messageEl: HTMLDivElement;

  constructor(root: HTMLElement, stageName: string, callbacks: HudCallbacks) {
    const hud = document.createElement('div');
    hud.id = 'hud';

    const top = document.createElement('div');
    top.className = 'hud-top';

    const title = document.createElement('span');
    title.className = 'hud-title';
    title.textContent = stageName;
    top.appendChild(title);

    this.creditEl = document.createElement('span');
    top.appendChild(this.creditEl);

    this.scoreEl = document.createElement('span');
    top.appendChild(this.scoreEl);

    const actions = document.createElement('span');
    actions.className = 'hud-actions';

    const muteBtn = document.createElement('button');
    muteBtn.type = 'button';
    muteBtn.className = 'hud-btn';
    muteBtn.textContent = '🔊';
    muteBtn.title = '効果音のON/OFF';
    muteBtn.addEventListener('click', () => {
      muteBtn.textContent = callbacks.onToggleMute() ? '🔇' : '🔊';
    });
    actions.appendChild(muteBtn);

    const cameraBtn = document.createElement('button');
    cameraBtn.type = 'button';
    cameraBtn.className = 'hud-btn';
    cameraBtn.textContent = '📷 視点リセット';
    cameraBtn.title = 'カメラを初期位置に戻す';
    cameraBtn.addEventListener('click', callbacks.onCameraReset);
    actions.appendChild(cameraBtn);

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'hud-btn';
    resetBtn.textContent = 'リセット';
    resetBtn.title = 'ゲームを最初からやり直す';
    resetBtn.addEventListener('click', () => location.reload());
    actions.appendChild(resetBtn);

    top.appendChild(actions);
    hud.appendChild(top);

    this.messageEl = document.createElement('div');
    this.messageEl.className = 'hud-message';
    hud.appendChild(this.messageEl);

    root.appendChild(hud);
  }

  setCredits(credits: number): void {
    this.creditEl.textContent = `クレジット: ${credits}`;
  }

  setScore(score: number): void {
    this.scoreEl.textContent = `スコア: ${score}`;
  }

  setMessage(message: string): void {
    this.messageEl.textContent = message;
  }
}
