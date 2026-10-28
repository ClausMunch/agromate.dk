// Kris visits the clearing, stays a while, and returns after a short flight away.
(() => {
  'use strict';
  const perch = { x: 570, y: 444 };
  let elapsed = 0, speechTime = 0;
  const lerp = (a, b, p) => a + (b - a) * p;
  function getPose(still = false) {
    const t = elapsed % 64;
    let pose;
    if (still || (t >= 9 && t < 39)) {
      pose = { ...perch, phase: 'landed', direction: -1, altitude: 0 };
    } else if (t >= 2 && t < 9) {
      const p = (t - 2) / 7, eased = p * p * (3 - 2 * p);
      pose = { x: lerp(1010, perch.x, eased), y: lerp(180, perch.y, eased), altitude: 65 * (1 - p), phase: 'landing', direction: -1 };
    } else if (t >= 39 && t < 43) {
      const p = (t - 39) / 4;
      pose = { x: perch.x + 105 * p * p, y: perch.y - 40 * p * p, altitude: 70 * p * p, phase: 'takeoff', direction: 1 };
    } else if (t >= 43 && t < 49) {
      const p = (t - 43) / 6;
      pose = { x: lerp(perch.x + 105, 1040, p), y: lerp(perch.y - 40, -30, p), altitude: 70 + 25 * p, phase: 'departing', direction: 1 };
    } else return null;
    return { ...pose, screenY: pose.y - pose.altitude, speaking: speechTime > 0 };
  }
  function hitTest(x, y, still = false) {
    const pose = getPose(still);
    return Boolean(pose && Math.abs(x - pose.x) <= 20 && y >= pose.screenY - 25 && y <= pose.screenY + 8);
  }
  function speak(still = false) {
    if (!getPose(still)) return false;
    speechTime = 2.6;
    return true;
  }
  function pixel(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); }
  function draw(c, pose, still) {
    c.save();
    c.fillStyle = pose.phase === 'landed' ? '#425f3d44' : '#425f3d22';
    c.beginPath();c.ellipse(pose.x, pose.y + 3, 12, 4, 0, 0, Math.PI * 2);c.fill();
    c.translate(Math.round(pose.x), Math.round(pose.screenY));c.scale(pose.direction, 1);
    const flying = pose.phase !== 'landed';
    const bob = !still && !flying && Math.sin(elapsed * 1.7) > .85 ? 1 : 0;
    if (!flying) {
      pixel(c, -4, -2, 2, 6, '#d8a74e');pixel(c, 4, -2, 2, 6, '#d8a74e');
      pixel(c, -4, 3, 5, 1, '#e4ba63');pixel(c, 4, 3, 5, 1, '#e4ba63');
    }
    c.translate(0, -bob);
    pixel(c, -10, -8, 19, 8, '#ececda');pixel(c, -7, -10, 12, 3, '#fff9df');
    pixel(c, -12, -7, 5, 4, '#929f9d');pixel(c, -14, -6, 3, 2, '#536669');
    pixel(c, -7, -6, 13, 4, '#aebbb6');pixel(c, -6, -6, 8, 1, '#cbd3c5');
    pixel(c, 4, -16, 7, 10, '#fbf7e0');pixel(c, 6, -17, 5, 2, '#fffbe6');
    pixel(c, 10, -12, 7, pose.speaking ? 3 : 2, '#e2b14c');
    pixel(c, 8, -14, 2, 2, '#374a45');
    if (pose.speaking) pixel(c, 11, -10, 5, 1, '#9e7335');
    if (flying) {
      const up = Math.sin(elapsed * 13) > 0;
      if (up) {
        pixel(c, -5, -18, 6, 12, '#cad3c8');pixel(c, -8, -24, 5, 8, '#e9ebd8');pixel(c, -9, -27, 4, 5, '#687e7c');
      } else {
        pixel(c, -3, -5, 6, 13, '#b1bfba');pixel(c, -6, 5, 5, 7, '#d8dfd0');pixel(c, -7, 10, 4, 4, '#687e7c');
      }
    }
    c.restore();
  }
  function drawGround(c, farmerY, behind, still = false) {
    const pose = getPose(still);
    if (pose?.phase === 'landed' && (pose.y <= farmerY) === behind) draw(c, pose, still);
  }
  function drawSky(c, still = false) {
    const pose = getPose(still);
    if (pose && pose.phase !== 'landed') draw(c, pose, still);
  }
  window.AgromateSeagull = {
    getPose, hitTest, speak, drawGround, drawSky,
    update(dt, still = false) {
      dt = Math.max(0, Math.min(dt, .05));
      if (!still) elapsed += dt;
      speechTime = Math.max(0, speechTime - dt);
    },
  };
})();
