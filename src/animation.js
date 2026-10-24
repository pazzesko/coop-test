import { ATTACK_ANIMATION, ATTACK_WINDUP, CLASSES } from './combat.js';

export function heroAnimation(hero, time, walking = false) {
  if (hero.hp <= 0) return { pose: 'dead', frame: 0 };
  if (hero.dodgeUntil > time) {
    const progress = 1 - (hero.dodgeUntil - time) / 0.28;
    return { pose: 'dodge', frame: progress < 0.5 ? 0 : 1 };
  }
  const start = hero.attackAt - CLASSES[hero.classId].cooldown;
  const age = time - start;
  if (hero.attackAt > 0 && age >= -0.001 && age < ATTACK_ANIMATION[hero.classId]) {
    const impact = ATTACK_WINDUP[hero.classId];
    return { pose: 'attack', frame: age < impact ? 0 : age < impact + 0.11 ? 1 : 2 };
  }
  if (hero.hurtUntil > time) return { pose: 'hurt', frame: 0 };
  return walking ? { pose: 'walk', frame: Math.floor(Math.max(0, time) * 10) % 4 }
    : { pose: 'idle', frame: Math.floor(Math.max(0, time) * 2) % 2 };
}

export function bossAnimation(circles, time, dead = false) {
  if (dead) return { pose: 'dead', frame: 0 };
  const struck = circles.filter(circle => circle.hitAt <= time && time - circle.hitAt < 0.38).sort((a, b) => b.hitAt - a.hitAt)[0];
  if (struck) return time - struck.hitAt < 0.13 ? { pose: 'slam', frame: 0 } : { pose: 'recover', frame: 0 };
  const next = circles.filter(circle => circle.hitAt > time).sort((a, b) => a.hitAt - b.hitAt)[0];
  if (next) return { pose: next.hitAt - time < 0.38 ? 'overhead' : 'windup', frame: Math.floor(time * 6) % 2 };
  return { pose: 'idle', frame: Math.floor(Math.max(0, time) * 2) % 2 };
}
