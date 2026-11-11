import { store } from './store';

/**
 * 疊在 Phaser 畫布上的 HTML 文字輸入框（中文要靠瀏覽器的輸入法，畫布做不到）。
 * - 輸入期間暫時恢復選字、指標事件（body 平常關掉了）
 * - 擋住按鍵事件往上傳，不然 Phaser 會把 A、D、空白鍵吃掉
 * - 手機螢幕鍵盤跳出來時，用 visualViewport 把框移到看得到的地方
 */

export interface AskTextOptions {
  title: string;
  value: string;
  /** 硬上限（UTF-16 長度），超過打不進去也不能確定 */
  max: number;
  /** 建議長度，超過時字數變橘色 */
  suggest?: number;
  note?: string;
  /** 額外的按鈕（例如「恢復原名」），按下去就用這個值結束 */
  reset?: { label: string; value: string };
}

const CSS = `
html.ti-typing, body.ti-typing { touch-action: auto; -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }
.ti-wrap { position: fixed; left: 0; top: 0; width: 100%; height: 100%; z-index: 9; display: flex; align-items: center; justify-content: center;
  background: rgba(13, 11, 20, 0.55); font-family: "Noto Sans TC", sans-serif; touch-action: auto;
  -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }
.ti-card { background: #fbf6ec; border: 4px solid #2a2433; border-top: 10px solid #d64545; border-radius: 6px; padding: 14px 18px 16px;
  width: min(440px, calc(100% - 32px)); box-sizing: border-box; color: #2a2433; box-shadow: 0 8px 30px rgba(0,0,0,0.4); }
.ti-title { font-size: 18px; font-weight: 900; margin-bottom: 8px; }
.ti-row { display: flex; gap: 8px; align-items: center; }
.ti-input { flex: 1; min-width: 0; font: 900 20px "Noto Sans TC", sans-serif; padding: 8px 10px; border: 2px solid #4a4460; border-radius: 4px;
  background: #fff; color: #2a2433; outline: none; -webkit-user-select: text; user-select: text; }
.ti-input:focus { border-color: #d64545; }
.ti-count { font-size: 15px; font-weight: 700; min-width: 44px; text-align: right; color: #6a6378; }
.ti-count.warn { color: #c8742b; }
.ti-note { font-size: 13px; color: #6a6378; margin-top: 6px; min-height: 18px; }
.ti-note.err { color: #b3262e; font-weight: 700; }
.ti-btns { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; flex-wrap: wrap; }
.ti-btns button { font: 700 16px "Noto Sans TC", sans-serif; border: 0; border-radius: 4px; padding: 8px 16px; color: #fff; background: #4a4460; cursor: pointer; }
.ti-btns .ok { background: #d64545; }
.ti-btns .reset { background: #7a6a5a; margin-right: auto; }
.ti-btns button:disabled { opacity: 0.45; cursor: default; }
`;

let open = false;

/** 跳出輸入框；確定回傳輸入的字，取消回傳 null */
export function askText(opt: AskTextOptions): Promise<string | null> {
  if (open || typeof document === 'undefined') return Promise.resolve(null);
  open = true;
  store.typing = true;
  if (!document.getElementById('ti-style')) {
    const st = document.createElement('style');
    st.id = 'ti-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const wrap = document.createElement('div');
  wrap.className = 'ti-wrap';
  wrap.innerHTML = `<div class="ti-card" role="dialog" aria-modal="true">
    <div class="ti-title"></div>
    <div class="ti-row"><input class="ti-input" type="text" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done" /><span class="ti-count"></span></div>
    <div class="ti-note"></div>
    <div class="ti-btns"><button class="reset" type="button"></button><button class="cancel" type="button">取消</button><button class="ok" type="button">確定</button></div>
  </div>`;
  const $ = <T extends HTMLElement>(sel: string) => wrap.querySelector(sel) as T;
  const input = $<HTMLInputElement>('.ti-input');
  const count = $<HTMLSpanElement>('.ti-count');
  const note = $<HTMLDivElement>('.ti-note');
  const ok = $<HTMLButtonElement>('.ok');
  const reset = $<HTMLButtonElement>('.reset');
  $<HTMLDivElement>('.ti-title').textContent = opt.title;
  input.value = opt.value.slice(0, opt.max);
  if (opt.reset) reset.textContent = opt.reset.label;
  else reset.remove();

  let composing = false;
  const refresh = () => {
    const n = input.value.trim().length;
    count.textContent = `${input.value.length}/${opt.max}`;
    count.classList.toggle('warn', !!opt.suggest && input.value.length > opt.suggest);
    const over = input.value.length > opt.max;
    note.classList.toggle('err', over || (!composing && n === 0));
    note.textContent = over ? `最多 ${opt.max} 個字` : !composing && n === 0 ? '店名不能空白' : opt.note ?? '';
    ok.disabled = composing || over || n === 0;
  };
  // 組字中不要截斷（會把輸入法的字打斷），組完再切到上限
  const clamp = () => {
    if (composing || input.value.length <= opt.max) return;
    input.value = input.value.slice(0, opt.max);
  };
  input.addEventListener('compositionstart', () => { composing = true; refresh(); });
  input.addEventListener('compositionend', () => { composing = false; clamp(); refresh(); });
  input.addEventListener('input', () => { clamp(); refresh(); });

  // 鍵盤擋住畫面：把整層貼齊看得到的範圍
  const vv = window.visualViewport;
  const fit = () => {
    if (!vv) return;
    wrap.style.top = `${vv.offsetTop}px`;
    wrap.style.left = `${vv.offsetLeft}px`;
    wrap.style.width = `${vv.width}px`;
    wrap.style.height = `${vv.height}px`;
  };
  vv?.addEventListener('resize', fit);
  vv?.addEventListener('scroll', fit);
  fit();

  // 暫時恢復選字、長按選單、觸控捲動（平常整頁都關掉了）
  document.documentElement.classList.add('ti-typing');
  document.body.classList.add('ti-typing');

  return new Promise((resolve) => {
    const finish = (v: string | null) => {
      if (!open) return;
      open = false;
      vv?.removeEventListener('resize', fit);
      vv?.removeEventListener('scroll', fit);
      document.documentElement.classList.remove('ti-typing');
      document.body.classList.remove('ti-typing');
      input.blur();
      wrap.remove();
      // 鍵盤收起來、畫面大小回穩之後才讓轉向處理重建畫面
      setTimeout(() => { store.typing = false; }, 600);
      resolve(v);
    };
    const submit = () => {
      clamp();
      refresh();
      if (!ok.disabled) finish(input.value);
    };
    ok.addEventListener('click', submit);
    $<HTMLButtonElement>('.cancel').addEventListener('click', () => finish(null));
    reset.addEventListener('click', () => finish(opt.reset!.value));
    // 點外面的暗處 = 取消
    wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) finish(null); });
    // 按鍵不要傳到 Phaser（它在 window 上聽，會吃掉 A、D、空白、數字鍵）
    for (const t of ['keydown', 'keyup', 'keypress'] as const) {
      wrap.addEventListener(t, (e) => {
        e.stopPropagation();
        if (t !== 'keydown') return;
        const k = e as KeyboardEvent;
        // 輸入法選字時的 Enter 是選字，不是確定
        if (k.isComposing || k.keyCode === 229) return;
        if (k.key === 'Enter') { k.preventDefault(); submit(); }
        else if (k.key === 'Escape') { k.preventDefault(); finish(null); }
      });
    }
    // 指標事件也不要傳到畫布
    for (const t of ['pointerdown', 'pointerup', 'pointermove', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'wheel'] as const) {
      wrap.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
    }
    document.body.appendChild(wrap);
    refresh();
    input.focus();
    input.select();
  });
}
