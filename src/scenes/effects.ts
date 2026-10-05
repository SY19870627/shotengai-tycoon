import Phaser from 'phaser';
import type { Emote, FxKind } from '../core/types';
import { C, FONT, hex } from '../theme';

/** 頭頂的心情圖示 */
export function drawEmote(scene: Phaser.Scene, kind: Emote): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  c.add(g);
  // 白底泡泡
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(0, 0, 17);
  g.fillTriangle(-5, 13, 5, 13, 0, 22);
  g.lineStyle(2, C.ink, 0.6);
  g.strokeCircle(0, 0, 17);
  switch (kind) {
    case 'anger':
      g.lineStyle(3.5, 0xd64545);
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.beginPath();
        g.arc(sx * 7, sy * 7, 6, Math.atan2(-sy, -sx) - 0.9, Math.atan2(-sy, -sx) + 0.9, false);
        g.strokePath();
      }
      break;
    case 'heart':
      g.fillStyle(0xe85a7a);
      g.fillCircle(-5, -3, 6);
      g.fillCircle(5, -3, 6);
      g.fillTriangle(-10.5, -0.5, 10.5, -0.5, 0, 11);
      break;
    case 'sweat':
      g.fillStyle(0x6fb6ea);
      g.fillCircle(2, 4, 7);
      g.fillTriangle(-4.5, 1, 8.5, 1, 4, -11);
      break;
    case 'shock':
      c.add(scene.add.text(0, 0, '!!', { fontFamily: FONT, fontSize: '22px', fontStyle: '900', color: '#d64545' }).setOrigin(0.5));
      break;
    case 'music':
      c.add(scene.add.text(0, 0, '♪', { fontFamily: FONT, fontSize: '24px', fontStyle: '900', color: '#7a4a9a' }).setOrigin(0.5));
      break;
    case 'idea':
      g.fillStyle(0xf2c14e);
      g.fillCircle(0, -3, 8);
      g.fillStyle(0x8a8a8a);
      g.fillRect(-4, 5, 8, 6);
      break;
    case 'sad':
      g.fillStyle(0x8a94a8);
      g.fillCircle(-5, -3, 6);
      g.fillCircle(4, -4, 7);
      g.fillStyle(0x6fb6ea);
      g.fillRect(-6, 5, 2, 6);
      g.fillRect(1, 6, 2, 6);
      g.fillRect(7, 5, 2, 6);
      break;
    case 'star':
      c.add(scene.add.star(0, 0, 5, 5, 12, C.gold).setStrokeStyle(1.5, 0xc8902a));
      break;
    case 'zzz':
      c.add(scene.add.text(0, 0, 'zZ', { fontFamily: FONT, fontSize: '18px', fontStyle: '900', color: '#4f7dc6' }).setOrigin(0.5));
      break;
  }
  return c;
}

/** 對話泡泡：name 顯示在左上角的名牌 */
export function drawBubble(scene: Phaser.Scene, name: string, text: string, maxW = 300): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const t = scene.add.text(0, 0, text, {
    fontFamily: FONT, fontSize: '17px', color: hex(C.ink), wordWrap: { width: maxW - 28, useAdvancedWrap: true }, lineSpacing: 4,
  });
  const w = Math.max(120, t.width + 28);
  const h = t.height + 26;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(-w / 2 + 3, -h + 3, w, h, 12);
  g.fillStyle(0xffffff);
  g.fillRoundedRect(-w / 2, -h, w, h, 12);
  g.lineStyle(2.5, C.ink);
  g.strokeRoundedRect(-w / 2, -h, w, h, 12);
  g.fillStyle(0xffffff);
  g.fillTriangle(-9, -2, 9, -2, 0, 14);
  g.lineStyle(2.5, C.ink);
  g.lineBetween(-9, 0, 0, 14);
  g.lineBetween(9, 0, 0, 14);
  t.setPosition(-w / 2 + 14, -h + 14);
  c.add([g, t]);
  if (name) {
    const n = scene.add.text(-w / 2 + 10, -h - 12, name, {
      fontFamily: FONT, fontSize: '14px', fontStyle: '900', color: '#ffffff', backgroundColor: hex(C.red), padding: { x: 7, y: 2 },
    });
    c.add(n);
  }
  c.setSize(w, h);
  return c;
}

/** 一次性的特效，播完自動消失。回傳持續時間（毫秒） */
export function playFx(scene: Phaser.Scene, kind: FxKind, x: number, y: number, depth = 90): number {
  const add = <T extends Phaser.GameObjects.GameObject & { setDepth(d: number): T }>(o: T) => o.setDepth(depth);
  const rnd = Phaser.Math.Between;
  switch (kind) {
    case 'firecracker': {
      for (let i = 0; i < 3; i++) {
        scene.time.delayedCall(i * 220, () => {
          const bx = x + rnd(-50, 50), by = y + rnd(-40, 0);
          for (let k = 0; k < 14; k++) {
            const p = add(scene.add.rectangle(bx, by, 4, 4, Phaser.Utils.Array.GetRandom([0xd64545, 0xf2c14e, 0xffffff])));
            const a = (Math.PI * 2 * k) / 14;
            scene.tweens.add({ targets: p, x: bx + Math.cos(a) * rnd(30, 60), y: by + Math.sin(a) * rnd(30, 60), alpha: 0, duration: 500, onComplete: () => p.destroy() });
          }
          const t = add(scene.add.text(bx, by - 20, '砰！', { fontFamily: FONT, fontSize: '20px', fontStyle: '900', color: '#d64545', stroke: '#fff', strokeThickness: 4 }).setOrigin(0.5));
          scene.tweens.add({ targets: t, y: by - 50, alpha: 0, duration: 600, onComplete: () => t.destroy() });
        });
      }
      return 900;
    }
    case 'confetti':
      for (let k = 0; k < 40; k++) {
        const p = add(scene.add.rectangle(x + rnd(-120, 120), y - rnd(120, 220), 6, 10,
          Phaser.Utils.Array.GetRandom([0xd64545, 0xf2c14e, 0x4f86c6, 0x5bb36a, 0xef8fb1])));
        scene.tweens.add({ targets: p, y: p.y + rnd(160, 260), angle: rnd(-360, 360), alpha: 0, duration: rnd(900, 1500), onComplete: () => p.destroy() });
      }
      return 900;
    case 'sparkle':
      for (let k = 0; k < 10; k++) {
        const p = add(scene.add.star(x + rnd(-60, 60), y + rnd(-80, 0), 4, 2, 7, C.gold).setScale(0));
        scene.tweens.add({ targets: p, scale: 1.2, yoyo: true, duration: 300, delay: k * 70, onComplete: () => p.destroy() });
      }
      return 900;
    case 'smoke':
      for (let k = 0; k < 8; k++) {
        const p = add(scene.add.circle(x + rnd(-20, 20), y, rnd(8, 14), 0xcccccc, 0.8));
        scene.tweens.add({ targets: p, y: y - rnd(40, 80), scale: 1.8, alpha: 0, duration: 800, delay: k * 40, onComplete: () => p.destroy() });
      }
      return 700;
    case 'stink':
      for (let k = 0; k < 4; k++) {
        const t = add(scene.add.text(x + rnd(-30, 30), y, '〰', { fontFamily: FONT, fontSize: '26px', color: '#7aa63a' }).setOrigin(0.5).setAngle(-90));
        scene.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 1100, delay: k * 150, onComplete: () => t.destroy() });
      }
      return 700;
    case 'flash': {
      const f = add(scene.add.circle(x, y - 40, 40, 0xffffff, 0.9));
      scene.tweens.add({ targets: f, scale: 2.5, alpha: 0, duration: 300, onComplete: () => f.destroy() });
      const t = add(scene.add.text(x, y - 90, '咔嚓', { fontFamily: FONT, fontSize: '16px', fontStyle: '900', color: '#2a2433', stroke: '#fff', strokeThickness: 4 }).setOrigin(0.5));
      scene.tweens.add({ targets: t, y: y - 115, alpha: 0, duration: 700, onComplete: () => t.destroy() });
      return 400;
    }
    case 'coins':
      for (let k = 0; k < 8; k++) {
        const p = add(scene.add.circle(x + rnd(-20, 20), y - 30, 6, C.gold).setStrokeStyle(1.5, 0xc8902a));
        scene.tweens.add({ targets: p, y: y - rnd(70, 110), alpha: 0, duration: 700, delay: k * 50, onComplete: () => p.destroy() });
      }
      return 700;
  }
  return 0;
}

/** 廟會神轎（四人扛） */
export function drawPalanquin(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  // 扛桿
  g.fillStyle(0x6b4a30);
  g.fillRect(-80, -64, 160, 6);
  // 轎身
  g.fillStyle(0xb3262e);
  g.fillRect(-34, -120, 68, 58);
  g.fillStyle(C.gold);
  g.fillRect(-34, -120, 68, 6);
  g.fillRect(-34, -68, 68, 6);
  g.fillRect(-10, -108, 20, 34);
  g.fillStyle(0x2a2433);
  g.fillRect(-6, -104, 12, 26);
  // 屋頂
  g.fillStyle(C.gold);
  g.fillTriangle(-48, -118, 48, -118, 0, -150);
  g.fillStyle(0xd64545);
  g.fillCircle(0, -152, 6);
  g.fillStyle(C.gold);
  g.fillTriangle(-52, -118, -40, -118, -56, -132);
  g.fillTriangle(52, -118, 40, -118, 56, -132);
  return g;
}

/** 小旗子（遶境旗手、活動布條用） */
export function drawFlag(scene: Phaser.Scene, text: string, color: number): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  g.fillStyle(0x6b4a30);
  g.fillRect(-2, -150, 4, 150);
  g.fillStyle(color);
  g.fillTriangle(2, -148, 2, -88, 44, -118);
  c.add(g);
  c.add(scene.add.text(14, -118, text, { fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: '#ffffff' }).setOrigin(0.5));
  return c;
}

