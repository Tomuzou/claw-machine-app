// game/hud.ts — クレジット・スコア・メッセージの表示
export class Hud {
  private readonly creditEl: HTMLSpanElement;
  private readonly scoreEl: HTMLSpanElement;
  private readonly messageEl: HTMLDivElement;

  constructor(root: HTMLElement, stageName: string) {
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

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.id = 'reset-btn';
    resetBtn.textContent = 'リセット';
    resetBtn.addEventListener('click', () => location.reload());
    top.appendChild(resetBtn);

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
