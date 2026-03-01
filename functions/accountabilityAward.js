const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.awardAccountabilityCheckin = functions.firestore
  .document('users/{uid}/accountabilityCheckins/{checkinId}')
  .onCreate(async (snap, context) => {
    const uid = context.params.uid;
    const checkin = snap.data() || {};

    if (checkin.awardedAt) {
      return null;
    }

    const dayKey = new Date().toISOString().slice(0, 10);
    const yesterdayKey = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const checkinRef = snap.ref;

    let mirroredStreak = null;

    await db.runTransaction(async (tx) => {
      const checkinDoc = await tx.get(checkinRef);
      const checkinData = checkinDoc.data() || {};

      if (checkinData.awardedAt) {
        return;
      }

      const userDoc = await tx.get(userRef);
      const userData = userDoc.data() || {};
      const currentStreak = userData.accountabilityStreak || 0;
      const lastAccountabilityDate = userData.lastAccountabilityDate;
      const nextStreak = lastAccountabilityDate === yesterdayKey ? currentStreak + 1 : 1;

      if (lastAccountabilityDate === dayKey) {
        tx.update(checkinRef, {
          awardedAt: admin.firestore.FieldValue.serverTimestamp(),
          awardSkipped: true,
          canonicalDayKey: dayKey,
        });
        return;
      }

      const entry = {
        ...(checkinData.entry || {}),
        date: dayKey,
      };

      tx.set(userRef, {
        accountabilityPoints: admin.firestore.FieldValue.increment(1),
        accountabilityStreak: nextStreak,
        lastAccountabilityDate: dayKey,
        workoutHistory: admin.firestore.FieldValue.arrayUnion(entry),
      }, {merge: true});

      tx.update(checkinRef, {
        awardedAt: admin.firestore.FieldValue.serverTimestamp(),
        canonicalDayKey: dayKey,
        awarded: true,
      });

      mirroredStreak = nextStreak;
    });

    if (typeof mirroredStreak === 'number') {
      await db.collection('publicUsers').doc(uid).set({
        accountabilityStreak: mirroredStreak,
      }, {merge: true});
    }

    return null;
  });
