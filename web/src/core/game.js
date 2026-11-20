// Deterministic, rendering-independent gameplay rules (PRD-0 / Contract v1.0).
export const TUNING = Object.freeze({
  player_speed: 6, carry_capacity: 8, lantern_cost: 5, lantern_count_night1: 5,
  pickup_radius: 1.2, interact_radius: 3, pulse_cost: 2, pulse_radius: 5,
  night1_duration_s: 300, flames: 3, invuln_s: 1.5, hit_drop_ratio: 0.5,
  pulse_stun_s: 2.5, pulse_push_m: 2.8, pulse_cooldown_s: 1.5,
  safe_radius: 4, shade_speed: 2.2, shade_hit_radius: 1,
  fall_enabled: false,
  score: { per_mote: 10, per_lantern: 100, per_stun: 25, per_second_left: 2, per_flame_left: 50 }
});
export const DT = 1 / 60;
const ISLAND_RADIUS = 24;
const LANTERN_RADIUS = 16;
const SPAWN_MOTES = 34;
const MAX_MOTES = 75;
const MAX_SHADES = 8;

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function rng(seed) {
  let s = Number(seed) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const vec = (p) => [Number(p[0]), Number(p[1]), Number(p[2])];
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const r3 = (v) => Math.round((v + Number.EPSILON) * 1000) / 1000;
function normXZ(dx, dz) {
  const size = Math.hypot(dx, dz);
  return size > 0 ? [dx / size, dz / size] : [0, 0];
}
function clampRadius(p, r = ISLAND_RADIUS - 0.6) {
  const l = Math.hypot(p[0], p[2]);
  if (l > r) { p[0] = p[0] / l * r; p[2] = p[2] / l * r; }
  return p;
}
function validateVec(p, label) {
  if (!Array.isArray(p) || p.length !== 3 || p.some(v => typeof v !== 'number' || !Number.isFinite(v)))
    throw new TypeError(label + ' must be an array of 3 finite numbers');
}
function validateBool(v, label) {
  if (typeof v !== 'boolean') throw new TypeError(label + ' must be boolean');
}
function validateNumber(v, label, min = -Infinity) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min)
    throw new TypeError(label + ' must be a finite number >= ' + min);
}
function validateInputFrames(inputs) {
  if (inputs === undefined || inputs === null) return [];
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs) || !Array.isArray(inputs.frames))
    throw new TypeError('inputs must be an object containing frames array');
  let last = -1;
  return inputs.frames.map((frame, i) => {
    if (!frame || typeof frame !== 'object' || Array.isArray(frame))
      throw new TypeError('frames[' + i + '] must be object');
    if (!Number.isSafeInteger(frame.tick) || frame.tick < 0 || frame.tick <= last)
      throw new TypeError('frame ticks must be non-negative strictly increasing integers');
    last = frame.tick;
    for (const key of Object.keys(frame)) {
      if (!['tick', 'move', 'cam_yaw_deg', 'jump', 'interact', 'pulse', 'dash'].includes(key))
        throw new TypeError('unknown frame key: ' + key);
    }
    if ('move' in frame) {
      if (!Array.isArray(frame.move) || frame.move.length !== 2 ||
          frame.move.some(v => typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 1))
        throw new TypeError('move must contain two numbers within [-1,1]');
    }
    if ('cam_yaw_deg' in frame) validateNumber(frame.cam_yaw_deg, 'cam_yaw_deg');
    for (const k of ['jump', 'interact', 'pulse', 'dash']) if (k in frame) validateBool(frame[k], k);
    return clone(frame);
  });
}
export function validateScenario(scenario) {
  if (scenario === undefined || scenario === null) return;
  if (typeof scenario !== 'object' || Array.isArray(scenario))
    throw new TypeError('scenario must be object');
  if ('player' in scenario) {
    const player = scenario.player;
    if (!player || typeof player !== 'object' || Array.isArray(player)) throw new TypeError('player must be object');
    if ('pos' in player) validateVec(player.pos, 'player.pos');
    if ('carried' in player && (!Number.isSafeInteger(player.carried) || player.carried < 0 || player.carried > TUNING.carry_capacity))
      throw new TypeError('player.carried invalid');
    if ('flames' in player && (!Number.isSafeInteger(player.flames) || player.flames < 0))
      throw new TypeError('player.flames invalid');
  }
  if ('random_motes' in scenario) validateBool(scenario.random_motes, 'random_motes');
  if ('random_shades' in scenario) validateBool(scenario.random_shades, 'random_shades');
  if ('time_left_s' in scenario) validateNumber(scenario.time_left_s, 'time_left_s', 0);
  if ('motes' in scenario) {
    if (!Array.isArray(scenario.motes)) throw new TypeError('motes must be array');
    scenario.motes.forEach((m, i) => validateVec(m, 'motes[' + i + ']'));
  }
  if ('shades' in scenario) {
    if (!Array.isArray(scenario.shades)) throw new TypeError('shades must be array');
    const ids = new Set();
    scenario.shades.forEach((s, i) => {
      if (!s || typeof s !== 'object' || Array.isArray(s)) throw new TypeError('shades entry must be object');
      validateVec(s.pos, 'shades[' + i + '].pos');
      if ('id' in s && (typeof s.id !== 'string' || !s.id || ids.has(s.id))) throw new TypeError('invalid/duplicate shade id');
      if ('id' in s) ids.add(s.id);
    });
  }
  if ('lanterns' in scenario) {
    if (!Array.isArray(scenario.lanterns)) throw new TypeError('lanterns must be array');
    const ids = new Set();
    for (const l of scenario.lanterns) {
      if (!l || typeof l !== 'object' || !/^L[1-5]$/.test(l.id) || ids.has(l.id))
        throw new TypeError('lantern id must be unique L1..L5');
      ids.add(l.id);
      if ('pos' in l) validateVec(l.pos, 'lantern.pos');
      if ('lit' in l) validateBool(l.lit, 'lantern.lit');
      if ('deposited' in l && (!Number.isSafeInteger(l.deposited) || l.deposited < 0))
        throw new TypeError('lantern.deposited invalid');
    }
  }
}
function lanternDefaults() {
  return Array.from({ length: 5 }, (_, i) => {
    const angle = Math.PI * 2 * i / 5 - Math.PI / 2;
    return { id: 'L' + (i + 1), pos: [r3(LANTERN_RADIUS * Math.cos(angle)), 0, r3(LANTERN_RADIUS * Math.sin(angle))], deposited: 0, lit: false };
  });
}

export class Game {
  constructor({ seed = 1, scenario = undefined, inputs = undefined } = {}) {
    if (!Number.isSafeInteger(seed)) throw new TypeError('seed must be integer');
    validateScenario(scenario);
    this.seed = seed;
    this.random = rng(seed);
    this.inputFrames = validateInputFrames(inputs);
    this.nextInputIndex = 0;
    this.input = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false };
    this.prevInput = { jump: false, interact: false, pulse: false, dash: false };
    this.tick = 0;
    this.state = 'playing';
    this.score = 0;
    this.events = [];
    this.player = { pos: [0, 0, 0], carried: 0, flames: TUNING.flames, jumpY: 0, vy: 0, invulnerableUntil: 0, pulseReady: 0 };
    this.lanterns = lanternDefaults();
    this.motes = [];
    this.shades = [];
    this.moteIndex = 0;
    this.shadeIndex = 0;
    this.initialTime = scenario?.time_left_s ?? TUNING.night1_duration_s;
    this.timeLeft = this.initialTime;
    this.endBonusAwarded = false;
    this.shadeSpawnTimer = 0;

    if (scenario?.player) {
      if (scenario.player.pos) this.player.pos = vec(scenario.player.pos);
      if (scenario.player.carried !== undefined) this.player.carried = scenario.player.carried;
      if (scenario.player.flames !== undefined) this.player.flames = scenario.player.flames;
    }
    if (scenario?.lanterns) for (const mod of scenario.lanterns) {
      const l = this.lanterns.find(x => x.id === mod.id);
      if ('pos' in mod) l.pos = vec(mod.pos);
      if ('deposited' in mod) l.deposited = mod.deposited;
      if ('lit' in mod) l.lit = mod.lit;
    }

    if (scenario?.motes !== undefined) {
      this.motes = scenario.motes.map(pos => this.createMote(pos));
    } else if (scenario?.random_motes !== false) {
      for (let i = 0; i < SPAWN_MOTES; i++) this.addRandomMote();
    }
    if (scenario?.random_motes === true && scenario.motes !== undefined) {
      for (let i = 0; i < SPAWN_MOTES; i++) this.addRandomMote();
    }
    if (scenario?.shades !== undefined) {
      this.shades = scenario.shades.map((s, i) => this.createShade(s.pos, s.id ?? 'S' + (i + 1)));
      this.shadeIndex = Math.max(this.shadeIndex, this.shades.length);
    } else if (scenario?.random_shades !== false) {
      for (let i = 0; i < 3; i++) this.addRandomShade(false);
    }
    if (scenario?.random_shades === true && scenario.shades !== undefined) {
      for (let i = 0; i < 3; i++) this.addRandomShade(false);
    }
    this.allowRandomMotes = scenario?.random_motes !== false;
    this.allowRandomShades = scenario?.random_shades !== false;
    // Scenario initialization never emits events or awards score, even if terminal.
    if (this.player.flames <= 0) this.state = 'lost';
    else if (this.lanterns.every(l => l.lit)) this.state = 'won';
  }

  createMote(pos) {
    this.moteIndex++;
    return { id: 'M' + this.moteIndex, pos: vec(pos) };
  }
  createShade(pos, id) { return { id, pos: vec(pos), state: 'chase', stunUntil: 0 }; }
  addRandomMote() {
    if (this.motes.length >= MAX_MOTES) return;
    const radius = 4 + this.random() * 17;
    const angle = this.random() * Math.PI * 2;
    this.motes.push(this.createMote([radius * Math.cos(angle), 0, radius * Math.sin(angle)]));
  }
  addRandomShade(emit = true) {
    if (this.shades.length >= MAX_SHADES) return;
    let id;
    do { id = 'S' + (++this.shadeIndex); } while (this.shades.some(s => s.id === id));
    const angle = this.random() * Math.PI * 2;
    const radius = 18 + this.random() * 4;
    const s = this.createShade([radius * Math.cos(angle), 1, radius * Math.sin(angle)], id);
    this.shades.push(s);
    if (emit) this.event('shade_spawned', { id });
  }
  event(name, data) { this.events.push({ type: 'event', tick: this.tick, name, data }); }
  finish(state, reason, emit = true) {
    if (this.state !== 'playing') return;
    this.state = state;
    if (state === 'won' && !this.endBonusAwarded) {
      this.score += Math.floor(this.timeLeft + 1e-8) * TUNING.score.per_second_left +
        this.player.flames * TUNING.score.per_flame_left;
      this.endBonusAwarded = true;
    }
    if (emit) this.event('game_over', { result: state, reason });
  }

  // The input frame numbered k is applied to the step that produces snapshot k+1.
  step(override = /** @type {any} */ (undefined)) {
    if (this.state !== 'playing') { this.events = []; return []; }
    this.tick += 1;
    this.events = [];
    const frameTick = this.tick - 1;
    while (this.nextInputIndex < this.inputFrames.length &&
           this.inputFrames[this.nextInputIndex].tick === frameTick) {
      Object.assign(this.input, this.inputFrames[this.nextInputIndex]);
      this.nextInputIndex++;
    }
    if (override) for (const k of ['move', 'cam_yaw_deg', 'jump', 'interact', 'pulse', 'dash'])
      if (k in override) this.input[k] = override[k];
    const press = {};
    for (const key of ['jump', 'interact', 'pulse', 'dash']) {
      press[key] = !!this.input[key] && !this.prevInput[key];
      this.prevInput[key] = !!this.input[key];
    }
    this.timeLeft = Math.max(0, this.initialTime - this.tick * DT);
    this.movePlayer(press.jump);
    this.pickup();
    if (press.interact) this.deposit();
    if (press.pulse) this.pulse();
    this.updateShades();
    if (this.state === 'playing') {
      if (this.lanterns.every(l => l.lit)) this.finish('won', 'all_lit');
      else if (this.timeLeft <= 1e-9) this.finish('lost', 'dawn');
    }
    return this.events;
  }

  movePlayer(jump) {
    const p = this.player;
    const [mx, mz] = this.input.move;
    const t = this.input.cam_yaw_deg * Math.PI / 180;
    let dx = mx * Math.cos(t) + mz * Math.sin(t);
    let dz = -mx * Math.sin(t) + mz * Math.cos(t);
    const len = Math.hypot(dx, dz);
    if (len > 1) { dx /= len; dz /= len; }
    p.pos[0] += dx * TUNING.player_speed * DT;
    p.pos[2] += dz * TUNING.player_speed * DT;
    clampRadius(p.pos);
    if (jump && p.jumpY <= 0) p.vy = 6.3;
    p.vy -= 18 * DT;
    p.jumpY = Math.max(0, p.jumpY + p.vy * DT);
    if (p.jumpY === 0) p.vy = 0;
    p.pos[1] = p.jumpY;
  }

  pickup() {
    const p = this.player;
    for (let i = this.motes.length - 1; i >= 0; i--) {
      if (p.carried >= TUNING.carry_capacity) break;
      if (d2(p.pos, this.motes[i].pos) <= TUNING.pickup_radius + 1e-9) {
        this.motes.splice(i, 1);
        p.carried++;
        this.score += TUNING.score.per_mote;
        this.event('mote_picked', { carried: p.carried });
      }
    }
  }

  deposit() {
    const p = this.player;
    const nearest = this.lanterns.filter(l => !l.lit && d2(l.pos, p.pos) <= TUNING.interact_radius + 1e-9)
      .sort((a, b) => d2(a.pos, p.pos) - d2(b.pos, p.pos) || a.id.localeCompare(b.id))[0];
    if (!nearest || p.carried <= 0) return;
    const amount = Math.min(p.carried, TUNING.lantern_cost - nearest.deposited);
    if (amount <= 0) return;
    p.carried -= amount;
    nearest.deposited += amount;
    this.event('deposit', { lantern_id: nearest.id, amount, deposited: nearest.deposited });
    if (nearest.deposited >= TUNING.lantern_cost) {
      nearest.lit = true;
      this.score += TUNING.score.per_lantern;
      this.event('lantern_lit', { lantern_id: nearest.id });
    }
  }

  pulse() {
    if (this.player.carried < TUNING.pulse_cost || this.tick < this.player.pulseReady) return;
    this.player.carried -= TUNING.pulse_cost;
    this.player.pulseReady = this.tick + Math.round(TUNING.pulse_cooldown_s * 60);
    const stunned = [];
    for (const shade of this.shades) {
      if (d2(shade.pos, this.player.pos) <= TUNING.pulse_radius + 1e-9) {
        shade.stunUntil = this.tick + Math.round(TUNING.pulse_stun_s * 60);
        shade.state = 'stunned';
        const [nx, nz] = normXZ(shade.pos[0] - this.player.pos[0], shade.pos[2] - this.player.pos[2]);
        shade.pos[0] += (nx || (nz ? 0 : 1)) * TUNING.pulse_push_m;
        shade.pos[2] += nz * TUNING.pulse_push_m;
        stunned.push(shade.id);
        this.score += TUNING.score.per_stun;
      }
    }
    this.event('pulse', { stunned_ids: stunned });
  }

  updateShades() {
    for (const s of this.shades) {
      if (this.tick < s.stunUntil) { s.state = 'stunned'; continue; }
      s.state = 'chase';
      const lit = this.lanterns.filter(l => l.lit);
      if (lit.some(l => d2(s.pos, l.pos) < TUNING.safe_radius)) {
        const l = lit.sort((a,b)=>d2(a.pos,s.pos)-d2(b.pos,s.pos))[0];
        const [dx, dz] = normXZ(s.pos[0] - l.pos[0], s.pos[2] - l.pos[2]);
        s.pos[0] += dx * TUNING.shade_speed * DT;
        s.pos[2] += dz * TUNING.shade_speed * DT;
        s.state = 'flee';
        continue;
      }
      const dist = d2(s.pos, this.player.pos);
      if (dist > 1e-12) {
        const [dx, dz] = normXZ(this.player.pos[0] - s.pos[0], this.player.pos[2] - s.pos[2]);
        const next = [s.pos[0] + dx * TUNING.shade_speed * DT, s.pos[1], s.pos[2] + dz * TUNING.shade_speed * DT];
        if (!lit.some(l => d2(next, l.pos) < TUNING.safe_radius)) {
          s.pos[0] = next[0]; s.pos[2] = next[2];
        } else s.state = 'flee';
      }
      if (d2(s.pos, this.player.pos) <= TUNING.shade_hit_radius + 1e-9 &&
          this.tick >= this.player.invulnerableUntil &&
          !lit.some(l => d2(this.player.pos, l.pos) <= TUNING.safe_radius + 1e-9)) {
        this.player.flames--;
        const dropped = Math.floor(this.player.carried * TUNING.hit_drop_ratio + 1e-9);
        this.player.carried -= dropped;
        for (let i = 0; i < dropped; i++) {
          const a = this.random() * Math.PI * 2;
          this.motes.push(this.createMote([
            this.player.pos[0] + Math.cos(a) * 1.8, 0,
            this.player.pos[2] + Math.sin(a) * 1.8
          ]));
        }
        this.player.invulnerableUntil = this.tick + Math.round(TUNING.invuln_s * 60);
        this.event('player_hit', { by: 'shade', flames: this.player.flames, dropped });
        if (this.player.flames <= 0) { this.finish('lost', 'no_flames'); return; }
      }
    }
    if (this.allowRandomMotes && this.tick % 300 === 0 && this.motes.length < 20) {
      for (let i = 0; i < 9; i++) this.addRandomMote();
    }
    if (this.allowRandomShades && this.tick > 0 && this.tick % 2400 === 0) this.addRandomShade();
  }

  snapshot() {
    const p = this.player;
    return {
      type: 'snapshot', tick: this.tick, sim_tick: this.tick, state: this.state,
      time_left_s: r3(this.timeLeft), score: this.score,
      player: { pos: p.pos.map(r3), flames: p.flames, carried: p.carried },
      lanterns: this.lanterns.map(l => ({ id: l.id, pos: l.pos.map(r3), lit: l.lit, deposited: l.deposited })),
      shades: this.shades.map(s => ({ id: s.id, pos: s.pos.map(r3), state: s.state })),
      motes_active: this.motes.length,
      motes: this.motes.map(m => ({ id: m.id, pos: m.pos.map(r3) }))
    };
  }
  end() { return { type: 'end', ticks: this.tick, state: this.state, score: this.score }; }
}

export function runSimulation(options, { ticks, snapshotEvery = 10 } = {}) {
  if (!Number.isSafeInteger(ticks) || ticks < 0) throw new TypeError('ticks must be a non-negative integer');
  if (!Number.isSafeInteger(snapshotEvery) || snapshotEvery <= 0)
    throw new TypeError('snapshotEvery must be a positive integer');
  const game = new Game(options);
  const lines = [game.snapshot()];
  while (game.tick < ticks && game.state === 'playing') {
    const events = game.step();
    lines.push(...events);
    if (game.tick % snapshotEvery === 0 || game.state !== 'playing') lines.push(game.snapshot());
  }
  lines.push(game.end());
  return lines;
}
