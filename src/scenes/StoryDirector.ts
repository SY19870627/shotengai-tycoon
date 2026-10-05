import type { Step, ChoiceOption } from '../core/types';
import { applyEffects } from '../core/game';
import { S, bus, Ev, store, save } from '../store';
import type { StreetScene } from './StreetScene';

/** 介面需要提供給導演的功能 */
export interface StoryUI {
  /** 等玩家點一下 */
  waitTap(): Promise<void>;
  /** 畫面中央的旁白字卡，點一下關閉 */
  narrate(text: string): Promise<void>;
  /** 顯示選項，回傳選了第幾個 */
  choose(prompt: string, options: ChoiceOption[]): Promise<number>;
  /** 進入／離開劇情模式（上下黑邊） */
  cinema(on: boolean): void;
  /** 效果套用後刷新面板 */
  refresh(): void;
}

/**
 * 劇情導演：依序執行劇本，街景負責角色演出，介面負責旁白與選項。
 */
export class StoryDirector {
  private busy = false;

  constructor(private street: StreetScene, private ui: StoryUI) {}

  async play(steps: Step[]): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    store.storyRunning = true;
    store.selected = -1;
    bus.emit(Ev.Select, -1);
    this.ui.cinema(true);
    try {
      await this.run(steps);
    } finally {
      this.street.stageHideBubbles();
      this.street.stageEnd();
      this.ui.cinema(false);
      store.storyRunning = false;
      this.busy = false;
      save();
      this.ui.refresh();
      bus.emit(Ev.StoryDone);
    }
  }

  private async run(steps: Step[]): Promise<void> {
    for (const st of steps) {
      if (!this.street.scene.isActive()) return;
      switch (st.t) {
        case 'focus':
          await this.street.stageFocus(st.on);
          break;
        case 'appear':
          await this.street.stageAppear(st.actor, st.near, st.dx);
          break;
        case 'walk':
          await this.street.stageWalk(st.actor, st.to, st.dx);
          break;
        case 'say':
          if (this.street.stageSay(st.actor, st.text)) {
            await this.ui.waitTap();
            this.street.stageHideBubbles();
          }
          break;
        case 'emote':
          await this.street.stageEmote(st.actor, st.kind);
          break;
        case 'narrate':
          this.street.stageHideBubbles();
          await this.ui.narrate(st.text);
          break;
        case 'fx':
          await this.street.stageFx(st.kind, st.at);
          break;
        case 'effect':
          applyEffects(S(), st.effects);
          this.afterEffects();
          break;
        case 'leave':
          await this.street.stageLeave(st.actor);
          break;
        case 'wait':
          await this.street.wait(st.ms);
          break;
        case 'choice': {
          this.street.stageHideBubbles();
          const idx = await this.ui.choose(st.prompt, st.options);
          const o = st.options[idx];
          if (o.cost) S().money -= o.cost;
          if (o.effects) {
            applyEffects(S(), o.effects);
            this.afterEffects();
          }
          if (o.then) await this.run(o.then);
          break;
        }
      }
    }
  }

  private afterEffects() {
    this.ui.refresh();
    bus.emit(Ev.LotRedraw, -1);
  }
}
