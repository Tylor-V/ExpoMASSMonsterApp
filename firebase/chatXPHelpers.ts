import { firestore } from './firebase';
import { Timestamp } from 'firebase/firestore';
import { Alert } from 'react-native';

function notifyLevelUp(level: number) {
  Alert.alert('Level Up!', `You reached level ${level}!`);
}

// XP curve for each level (edit these as you scale up)
export const levelThresholds = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3300, 3950, 4650, 5400, 6200, 7050, 7950
];

// Get what level the XP qualifies for
export function getLevelForXP(xp: number) {
  let level = 1;
  for (let i = 1; i < levelThresholds.length; i++) {
    if (xp >= levelThresholds[i]) level = i + 1;
    else break;
  }
  return level;
}

// --- Main XP award function (auto-fixes chatLevel every time) ---
export async function awardXP(uid, type: 'message'|'reaction'|'referral'|'event', opts = {}) {
  const userRef = firestore().collection('users').doc(uid);
  const doc = await userRef.get();
  if (!doc.exists) return;

  const data = doc.data();
  let xp = data.chatXP || 0;
  let level = data.chatLevel || 1;
  let now = Date.now();
  let updateObj = {};
  let shouldUpdate = false;

  // --- XP rules ---
  const XP_RULES = {
    message: { xp: 5, cooldown: 60 },     // seconds
    reaction: { xp: 3, cooldown: 0 },     // per unique user per message
    dailyStreak: { base: 10, streakBonus: 5 },
    referral: { xp: 50 },
    event: { xp: 20 },
  };

  // --- MESSAGE XP (with cooldown) ---
  if (type === 'message') {
    const lastXP = data.lastXPGivenAt?.toMillis ? data.lastXPGivenAt.toMillis() : 0;
    if (now - lastXP >= XP_RULES.message.cooldown * 1000) {
      xp += XP_RULES.message.xp;
      updateObj['lastXPGivenAt'] = Timestamp.now();
      shouldUpdate = true;
    }
  }

  // --- REACTION XP (only for recipient, per unique user per message) ---
  if (type === 'reaction' && opts.reactorId && opts.messageId) {
    const reactedBy = data.reactionXP || {}; // { [messageId]: [reactorIds] }
    if (!reactedBy[opts.messageId]) reactedBy[opts.messageId] = [];
    if (!reactedBy[opts.messageId].includes(opts.reactorId)) {
      xp += XP_RULES.reaction.xp;
      reactedBy[opts.messageId].push(opts.reactorId);
      updateObj['reactionXP'] = reactedBy;
      shouldUpdate = true;
    }
  }

  // --- REFERRAL XP ---
  if (type === 'referral') {
    xp += XP_RULES.referral.xp;
    shouldUpdate = true;
  }

  // --- EVENT XP ---
  if (type === 'event') {
    xp += XP_RULES.event.xp;
    shouldUpdate = true;
  }

  // --- LEVEL UP (auto-fix always, even on XP removal) ---
  const newLevel = getLevelForXP(xp);
  updateObj['chatLevel'] = newLevel; // <--- always in sync
  if (newLevel > level) {
    notifyLevelUp(newLevel);
  }
  updateObj['chatXP'] = xp;

  if (shouldUpdate || newLevel !== level) await userRef.update(updateObj);
}

// --- Award daily streak XP (call once per login/session/chat open) ---
export async function awardStreakXP(uid) {
  const userRef = firestore().collection('users').doc(uid);
  const doc = await userRef.get();
  if (!doc.exists) return;
  const data = doc.data();
  let lastDailyXP = data.lastDailyXP?.toMillis ? data.lastDailyXP.toMillis() : 0;
  let streak = data.messageStreak || 0;
  let today = new Date();
  today.setHours(0,0,0,0);
  let now = Date.now();

  const XP_RULES = {
    dailyStreak: { base: 10, streakBonus: 5 },
  };

  if (now - lastDailyXP >= 24 * 60 * 60 * 1000) {
    let yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let awardedYesterday = (lastDailyXP >= yesterday.getTime() && lastDailyXP < today.getTime());
    streak = awardedYesterday ? streak + 1 : 1;
    const streakXP = XP_RULES.dailyStreak.base + XP_RULES.dailyStreak.streakBonus * (streak - 1);
    const xp = (data.chatXP || 0) + streakXP;
    const newLevel = getLevelForXP(xp);

    let updateObj = {
      chatXP: xp,
      messageStreak: streak,
      lastDailyXP: Timestamp.now(),
      chatLevel: newLevel,
    };
    if (newLevel > (data.chatLevel || 1)) {
      notifyLevelUp(newLevel);
    }
    await userRef.update(updateObj);
    // Optionally: show streak animation in UI!
  }
}

// --- Fix user level based on their XP (auto-corrects if wrong) ---
export async function fixUserLevel(uid) {
  const userRef = firestore().collection('users').doc(uid);
  const doc = await userRef.get();
  if (!doc.exists) return;
  const data = doc.data();
  const xp = data.chatXP || 0;
  const correctLevel = getLevelForXP(xp);
  if (data.chatLevel !== correctLevel) {
    await userRef.update({ chatLevel: correctLevel });
  }
}

export const getChatLevelColor = (level) => {
  // You can customize these colors for each level
  if (!level || typeof level !== 'number') return '#a259ff'; // fallback
  if (level === 1) return '#a259ff';
  if (level === 2) return '#f76b1c';
  if (level === 3) return '#fae063';
  return '#a259ff'; // default fallback
};