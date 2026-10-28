// Ambient wildlife uses its own clock and never changes farm progress.
(() => {
  'use strict';
  let elapsed = 0;
  const anchors = [{ x: 751, y: 349 }, { x: 789, y: 365 }, { x: 819, y: 347 }];
  const offsets = [0, 13, 29];
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  function swimming(index, seconds) {
    const anchor = anchors[index], angle = seconds * .22;
    return {
      x: anchor.x + Math.sin(angle) * 12,
      y: anchor.y + Math.sin(angle * 2) * 5,
      direction: Math.cos(angle) < 0 ? -1 : 1,
    };
  }
  function duckAt(index, seconds) {
    const phase = (seconds + offsets[index]) % 57;
    const anchor = anchors[index];
    if (phase < 6) {
      const p = phase / 6, ease = smooth(p);
      return { ...anchor, phase: 'landing', x: lerp(1030, anchor.x, ease), y: lerp(125, anchor.y, ease), altitude: 60 * (1 - p), direction: -1, progress: p };
    }
    if (phase < 32) return { ...swimming(index, phase - 6), phase: 'swimming', altitude: 0, progress: phase - 6 };
    const start = swimming(index, 26);
    if (phase < 37) {
      const p = (phase - 32) / 5;
      return { phase: 'takeoff', x: start.x + 95 * p * p, y: start.y - 42 * p * p, altitude: 65 * p * p, direction: 1, progress: p };
    }
    if (phase < 43) {
      const p = (phase - 37) / 6;
      return { phase: 'departing', x: lerp(start.x + 95, 1050, p), y: lerp(start.y - 42, -30, p), altitude: 65 + 25 * p, direction: 1, progress: p };
    }
    return { phase: 'away' };
  }
  function pixel(c, x, y, w, h, color) {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), w, h);
  }
  function ripple(c, x, y, radius, opacity = .6) {
    c.save();
    c.globalAlpha = opacity;
    c.strokeStyle = '#d0dfbf';
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(Math.round(x), Math.round(y), radius, radius * .32, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
  function drawDuck(c, duck, index, flying, still) {
    c.save();
    c.translate(Math.round(duck.x), Math.round(duck.y - duck.altitude));
    c.scale(duck.direction, 1);
    const female = index === 1;
    pixel(c, -7, -4, 13, 7, female ? '#a58d68' : '#d6cbb0');
    pixel(c, -5, -5, 8, 2, female ? '#c0a67e' : '#eee0bf');
    pixel(c, -8, -5, 3, 3, '#645d4c');
    pixel(c, -3, -2, 7, 3, female ? '#806d52' : '#8b8980');
    pixel(c, 3, -9, 6, 7, female ? '#a9946a' : '#4b7962');
    pixel(c, 3, -3, 5, 2, female ? '#cbb285' : '#f0e2b4');
    pixel(c, 8, -6, 4, 2, '#d5a455');
    pixel(c, 7, -8, 1, 1, '#303f37');
    if (flying) {
      const wing = Math.sin(elapsed * 15 + index * 1.7);
      if (wing > .1) {
        pixel(c, -4, -11, 4, 9, '#8a8c80');
        pixel(c, -6, -15, 3, 6, '#b6b6a0');
        pixel(c, -7, -16, 2, 3, '#d9d3b6');
      } else {
        pixel(c, -3, -1, 5, 8, '#96988a');
        pixel(c, -5, 5, 4, 4, '#c3c0a6');
      }
      pixel(c, -3, 3, 3, 2, '#d29e54');
    } else {
      pixel(c, -7, 3, 15, 1, '#bbd2bb');
      if (!still && Math.sin(elapsed * 3 + index) > .4) pixel(c, -2, 4, 3, 1, '#d3ae67');
    }
    c.restore();
  }
  function drawWater(c, still) {
    for (let i = 0; i < anchors.length; i++) {
      const duck = still ? { ...swimming(i, 6), phase: 'swimming', altitude: 0 } : duckAt(i, elapsed);
      if (duck.phase === 'swimming') {
        if (!still) {
          const pulse = (elapsed * .65 + i * .31) % 1;
          ripple(c, duck.x - duck.direction * 7, duck.y + 3, 5 + pulse * 11, (1 - pulse) * .45);
          pixel(c, duck.x - duck.direction * 15, duck.y + 3, 6, 1, '#b0cdb1');
        }
        if (!still && duck.progress < 1.8) ripple(c, anchors[i].x, anchors[i].y, 8 + duck.progress * 9, (1 - duck.progress / 1.8) * .8);
        drawDuck(c, duck, i, false, still);
      } else if (duck.phase === 'takeoff' && duck.progress < .32) {
        ripple(c, duck.x, duck.y + 3, 7 + duck.progress * 20, .6 - duck.progress);
        pixel(c, duck.x - 7, duck.y - 3, 2, 3, '#dce7c6');
        pixel(c, duck.x - 13, duck.y - 6, 2, 2, '#dce7c6');
      }
    }
  }
  function drawSky(c) {
    for (let i = 0; i < anchors.length; i++) {
      const duck = duckAt(i, elapsed);
      if (duck.phase === 'away' || duck.phase === 'swimming') continue;
      c.save();
      c.globalAlpha = Math.max(.04, .18 - duck.altitude * .0015);
      c.fillStyle = '#344e3b';
      c.beginPath();
      c.ellipse(duck.x, duck.y + 2, 8, 3, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
      drawDuck(c, duck, i, true, false);
    }
    // Small staggered flocks cross the clearing, then leave it quiet again.
    for (let i = 0; i < 3; i++) {
      const phase = (elapsed + i * 2.3 + 9) % 38;
      if (phase > 18) continue;
      const x = lerp(-45, 1010, phase / 18), y = 100 + i * 14 + Math.sin(phase * .28) * 34;
      const up = Math.sin(elapsed * 13 + i) > 0;
      pixel(c, x, y, 3, 2, '#536351');
      pixel(c, x - 3, y + (up ? -2 : 2), 4, 2, '#65755b');
      pixel(c, x + 2, y + (up ? -2 : 2), 4, 2, '#65755b');
      pixel(c, x - 5, y + (up ? -4 : 4), 3, 2, '#7d8c6b');
      pixel(c, x + 5, y + (up ? -4 : 4), 3, 2, '#7d8c6b');
    }
  }
  window.AgromateWildlife = {
    update(dt) { elapsed += Math.max(0, Math.min(dt, .05)); },
    drawWater,
    drawSky,
  };
})();
