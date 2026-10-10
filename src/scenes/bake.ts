import Phaser from 'phaser';

/**
 * 把不會再變的 Graphics「烘」成圖片。
 *
 * Graphics 每一幀都要重新算一次形狀（山稜線、磚牆、招牌……一條街加起來有好幾萬個畫圖指令），
 * 手機的處理器很吃力。畫好之後就不會動的，先畫進一張貼圖，之後每一幀只要貼圖。
 * 看起來完全一樣（同一個渲染器畫的），只是不用每幀重算。
 */

/** 指令太少的不值得多佔一張貼圖 */
const MIN_COMMANDS = 120;
/** 一張貼圖最大邊長（舊手機的上限多半是 4096，保守一點） */
const MAX_SIZE = 2048;

let seq = 0;

/** Graphics 指令的參數個數（Phaser.GameObjects.Graphics 的 commandBuffer 格式） */
const ARGS: Record<number, number> = {
  0: 7, // ARC
  1: 0, // BEGIN_PATH
  2: 0, // CLOSE_PATH
  3: 4, // FILL_RECT
  4: 2, // LINE_TO
  5: 2, // MOVE_TO
  6: 3, // LINE_STYLE
  7: 2, // FILL_STYLE
  8: 0, // FILL_PATH
  9: 0, // STROKE_PATH
  10: 6, // FILL_TRIANGLE
  11: 6, // STROKE_TRIANGLE
  14: 0, // SAVE
  15: 0, // RESTORE
  21: 8, // GRADIENT_FILL_STYLE
  22: 6, // GRADIENT_LINE_STYLE
};

/** 算出畫的範圍（本地座標）。有位移、縮放、旋轉指令或看不懂的指令就放棄 */
function boundsOf(g: Phaser.GameObjects.Graphics): { x0: number; y0: number; x1: number; y1: number } | null {
  const b = g.commandBuffer as number[];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  let lw = 0;
  const add = (x: number, y: number, r = 0) => {
    if (x - r < x0) x0 = x - r;
    if (y - r < y0) y0 = y - r;
    if (x + r > x1) x1 = x + r;
    if (y + r > y1) y1 = y + r;
  };
  for (let i = 0; i < b.length;) {
    const op = b[i++];
    const n = ARGS[op];
    if (n === undefined) return null;
    switch (op) {
      case 0: add(b[i], b[i + 1], b[i + 2] + lw); break;
      case 3: add(b[i], b[i + 1]); add(b[i] + b[i + 2], b[i + 1] + b[i + 3]); break;
      case 4: case 5: add(b[i], b[i + 1], lw); break;
      case 6: case 22: lw = b[i]; break;
      case 10: case 11: for (let k = 0; k < 6; k += 2) add(b[i + k], b[i + k + 1], op === 11 ? lw : 0); break;
    }
    i += n;
  }
  return x0 <= x1 && y0 <= y1 ? { x0, y0, x1, y1 } : null;
}

/** 把一個 Graphics 換成畫好的圖片（放在原本的位置、深度、視差、顯示順序） */
/** 疊加用的混色（純相加），烘夜光層用：重疊的光暈跟原本一樣越疊越亮 */
let sumBlend = -1;
function sumBlendMode(scene: Phaser.Scene): number {
  const r = scene.renderer;
  if (!(r instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return -1;
  if (sumBlend < 0) sumBlend = r.addBlendMode([r.gl.ONE, r.gl.ONE], r.gl.FUNC_ADD);
  return sumBlend;
}

export function bake(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): Phaser.GameObjects.GameObject[] {
  const keep = [g];
  if (!g.active || g.commandBuffer.length < MIN_COMMANDS) return keep;
  if (g.scaleX !== 1 || g.scaleY !== 1 || g.rotation !== 0) return keep;
  // 發光（ADD）的夜光層：用純相加畫進貼圖，貼出來再用 ADD
  const blend = g.blendMode as number;
  const additive = blend === Phaser.BlendModes.ADD;
  if (blend !== Phaser.BlendModes.NORMAL && !additive) return keep;
  const drawBlend = additive ? sumBlendMode(scene) : Phaser.BlendModes.NORMAL;
  if (drawBlend < 0) return keep;
  const bb = boundsOf(g);
  if (!bb) return keep;
  const x0 = Math.floor(bb.x0) - 2, y0 = Math.floor(bb.y0) - 2;
  const x1 = Math.ceil(bb.x1) + 2, y1 = Math.ceil(bb.y1) + 2;
  const parent = g.parentContainer;
  const list = (parent ? parent.list : scene.children.list) as Phaser.GameObjects.GameObject[];
  let idx = list.indexOf(g);
  const out: Phaser.GameObjects.Image[] = [];
  const { alpha, visible, depth } = g;
  g.setAlpha(1).setVisible(true).setBlendMode(drawBlend);
  for (let cy = y0; cy < y1; cy += MAX_SIZE) {
    for (let cx = x0; cx < x1; cx += MAX_SIZE) {
      const key = `__baked${seq++}`;
      const tex = scene.textures.addDynamicTexture(key, Math.min(MAX_SIZE, x1 - cx), Math.min(MAX_SIZE, y1 - cy));
      if (!tex) continue;
      tex.draw(g, -cx, -cy);
      const img = scene.make.image({ x: g.x + cx, y: g.y + cy, key }, false).setOrigin(0)
        .setScrollFactor(g.scrollFactorX, g.scrollFactorY).setAlpha(alpha).setVisible(visible).setBlendMode(blend);
      // 圖片拿掉（換店面、離開這條街）時，貼圖也一起釋放
      img.once(Phaser.GameObjects.Events.DESTROY, () => scene.textures.remove(key));
      out.push(img);
      if (parent) parent.addAt(img, idx++);
      else {
        scene.children.addAt(img, idx++);
        img.setDepth(depth);
      }
    }
  }
  g.destroy();
  return out;
}

/** 一次處理多個（只挑 Graphics；容器裡的也會處理）。回傳處理後的物件 */
export function bakeAll(scene: Phaser.Scene, objs: readonly Phaser.GameObjects.GameObject[]): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];
  for (const o of [...objs]) {
    if (o instanceof Phaser.GameObjects.Graphics) out.push(...bake(scene, o));
    else {
      if (o instanceof Phaser.GameObjects.Container) bakeAll(scene, o.list);
      out.push(o);
    }
  }
  return out;
}
