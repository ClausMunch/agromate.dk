// The farm cat and mice are ambient company, independent of the saved economy.
(() => {
  'use strict';
  let seed = 73, elapsed = 0;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const cat = { x: 433, y: 458, direction: 1, mode: 'stroll', timer: 0, gait: 0, target: { x: 542, y: 473 }, catches: 0 };
  const mouse = { x: 0, y: 0, active: false, direction: 1 };
  let spawnIn = 4, jump = null;
  function mode(name) { cat.mode = name; cat.timer = 0; }
  function moveToward(target, speed, dt) {
    const dx = target.x - cat.x, dy = target.y - cat.y, distance = Math.hypot(dx, dy);
    if (distance < .5) return true;
    const step = Math.min(distance, speed * dt);
    cat.x += dx / distance * step; cat.y += dy / distance * step;
    if (Math.abs(dx) > .5) cat.direction = Math.sign(dx);
    cat.gait += step * .35;
    return step >= distance;
  }
  function update(dt) {
    dt = clamp(dt, 0, .05); elapsed += dt; cat.timer += dt;
    if (!mouse.active) {
      spawnIn -= dt;
      if (spawnIn <= 0 && cat.mode !== 'groom') {
        mouse.x = clamp(cat.x + (cat.x > 510 ? -58 : 58), 365, 625);
        mouse.y = clamp(cat.y + 12, 448, 488);
        mouse.direction = mouse.x > cat.x ? 1 : -1;
        mouse.active = true; mode('notice');
      }
    }
    switch (cat.mode) {
      case 'stroll':
        if (moveToward(cat.target, 17, dt)) mode('rest');
        break;
      case 'rest':
        if (cat.timer > 1.5) { cat.target = { x: 365 + random() * 255, y: 448 + random() * 40 }; mode('stroll'); }
        break;
      case 'notice':
        cat.direction = mouse.x >= cat.x ? 1 : -1;
        if (cat.timer > .8) mode('stalk');
        break;
      case 'stalk':
        moveToward(mouse, 14, dt);
        if (Math.hypot(cat.x - mouse.x, cat.y - mouse.y) < 36 || cat.timer > 3) mode('chase');
        break;
      case 'chase':
        mouse.x = clamp(mouse.x + mouse.direction * 28 * dt, 365, 633);
        mouse.y = clamp(mouse.y + Math.sin(elapsed * 9) * 8 * dt, 448, 488);
        moveToward(mouse, 95, dt);
        if (Math.hypot(cat.x - mouse.x, cat.y - mouse.y) < 19) {
          jump = { x: cat.x, y: cat.y, toX: mouse.x, toY: mouse.y };
          mode('pounce');
        }
        break;
      case 'pounce': {
        const p = Math.min(1, cat.timer / .55);
        cat.x = jump.x + (jump.toX - jump.x) * p;
        cat.y = jump.y + (jump.toY - jump.y) * p;
        if (p >= 1) { mouse.active = false; cat.catches++; spawnIn = 9 + random() * 7; mode('groom'); }
        break;
      }
      case 'groom':
        if (cat.timer > 2.2) { cat.target = { x: 365 + random() * 255, y: 448 + random() * 40 }; mode('stroll'); }
        break;
    }
  }
  function pixel(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); }
  function shadow(c, x, y, rx, ry) { c.fillStyle = '#3f593d44'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
  function drawMouse(c, still) {
    if (!mouse.active || still) return;
    shadow(c, mouse.x, mouse.y + 2, 5, 2);
    c.save(); c.translate(Math.round(mouse.x), Math.round(mouse.y)); c.scale(mouse.direction, 1);
    const scurry = cat.mode === 'chase' && Math.sin(elapsed * 32) > 0 ? 1 : 0;
    pixel(c, -4, -3 - scurry, 8, 4, '#918879');
    pixel(c, 2, -4 - scurry, 4, 4, '#a69b87');
    pixel(c, 2, -5 - scurry, 2, 2, '#ceafa0');
    pixel(c, 5, -3 - scurry, 1, 1, '#3e463b');
    pixel(c, -8, 0, 5, 1, '#b7a28a'); pixel(c, -10, -1, 3, 1, '#b7a28a');
    c.restore();
  }
  function drawCat(c, still) {
    const hunting = ['notice', 'stalk', 'chase'].includes(cat.mode);
    const walking = ['stroll', 'stalk', 'chase'].includes(cat.mode);
    const sitting = still || ['rest', 'groom'].includes(cat.mode);
    const hop = !still && cat.mode === 'pounce' ? Math.sin(Math.min(1, cat.timer / .55) * Math.PI) * 13 : 0;
    const stride = !still && walking ? Math.round(Math.sin(cat.gait) * 2) : 0;
    shadow(c, cat.x, cat.y + 2, 12, 3);
    c.save(); c.translate(Math.round(cat.x), Math.round(cat.y - hop)); c.scale(cat.direction, 1);
    // Curled tail, tabby body, cream paws, triangular ears and a pink nose.
    const tail = still ? 0 : Math.round(Math.sin(elapsed * (hunting ? 7 : 2.2)) * 2);
    pixel(c, -13, -9, 4, 8, '#b37c4b'); pixel(c, -16, -14 + tail, 3, 8 - tail, '#cf9a5b'); pixel(c, -16, -15 + tail, 5, 3, '#dfb072');
    pixel(c, -10, sitting ? -13 : -10, sitting ? 13 : 18, sitting ? 14 : 10, '#cb9255');
    pixel(c, -8, sitting ? -14 : -11, sitting ? 9 : 14, 3, '#e0ac6c');
    for (const x of [-7, -2, 3]) pixel(c, x, sitting ? -12 : -9, 2, 4, '#a97448');
    if (sitting) { pixel(c, 0, -7, 5, 8, '#f1dab1'); pixel(c, -6, 0, 6, 2, '#eed6aa'); }
    else { pixel(c, -8 + stride, -1, 3, 4, '#e8c998'); pixel(c, 3 - stride, -1, 3, 4, '#f0d8b0'); }
    const headX = sitting ? 1 : 7, headY = (sitting ? -20 : -17) + (hunting ? 3 : 0);
    pixel(c, headX - 3, headY + 3, 10, 9, '#dfa565');
    pixel(c, headX - 3, headY, 3, 6, '#bf8652'); pixel(c, headX + 4, headY, 3, 6, '#bf8652');
    pixel(c, headX - 2, headY + 2, 1, 3, '#e2b09a'); pixel(c, headX + 5, headY + 2, 1, 3, '#e2b09a');
    pixel(c, headX, headY + 6, 2, 2, '#516043'); pixel(c, headX + 5, headY + 6, 2, 2, '#516043');
    pixel(c, headX + 2, headY + 9, 4, 3, '#f3deb7'); pixel(c, headX + 4, headY + 9, 2, 1, '#bd7d73');
    pixel(c, headX - 3, headY + 10, 3, 1, '#f0d7a6'); pixel(c, headX + 7, headY + 10, 3, 1, '#f0d7a6');
    if (!still && cat.mode === 'groom') {
      const paw = Math.sin(cat.timer * 9) > 0 ? 0 : 2;
      pixel(c, 4, -10 + paw, 4, 4, '#f4deb4');
      if (cat.timer < .7) { pixel(c, 0, -29, 2, 5, '#f4dc9c'); pixel(c, -2, -27, 6, 1, '#f4dc9c'); }
    }
    if (!still && cat.mode === 'notice') { pixel(c, 1, -30, 2, 5, '#f5e3b0'); pixel(c, 1, -23, 2, 2, '#f5e3b0'); }
    c.restore();
  }
  function drawGround(c, farmerY, behind, still) {
    if ((mouse.y <= farmerY) === behind) drawMouse(c, still);
    if ((cat.y <= farmerY) === behind) drawCat(c, still);
  }
  window.AgromateCompanions = { update, drawGround };
})();
