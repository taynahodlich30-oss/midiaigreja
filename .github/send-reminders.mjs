import admin from 'firebase-admin';

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error('O segredo FIREBASE_SERVICE_ACCOUNT não foi configurado.');
}

const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(credentials)
});

const db = admin.firestore();
const messaging = admin.messaging();

function parsePortalDate(value) {
  if (!value) return null;

  return new Date(
    /[zZ]|[+-]\d\d:\d\d$/.test(value)
      ? value
      : `${value}:00-03:00`
  );
}

function saoPauloParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  return Object.fromEntries(
    parts.map(part => [part.type, part.value])
  );
}

function reminderMoment(eventDate, now) {
  const hours = (eventDate - now) / 3600000;

  if (hours >= 23.75 && hours <= 24.25) {
    return { key: 'um-dia', label: 'É amanhã' };
  }

  if (hours >= 0.75 && hours <= 1.25) {
    return { key: 'uma-hora', label: 'Começa em uma hora' };
  }

  const event = saoPauloParts(eventDate);
  const today = saoPauloParts(now);

  const sameDate =
    event.year === today.year &&
    event.month === today.month &&
    event.day === today.day;

  if (
    sameDate &&
    Number(today.hour) === 8 &&
    Number(today.minute) < 16
  ) {
    return { key: 'hoje', label: 'É hoje' };
  }

  return null;
}

const now = new Date();
const rosters = await db.collection('rosters').get();
let sent = 0;

for (const rosterDoc of rosters.docs) {
  const roster = rosterDoc.data();
  const eventDate = parsePortalDate(roster.dateTime);

  if (!eventDate || eventDate <= now) continue;

  const moment = reminderMoment(eventDate, now);
  if (!moment) continue;

  const songTitles = [];

  for (const songId of roster.songIds || []) {
    const song = await db
      .collection('songs')
      .doc(String(songId))
      .get();

    if (song.exists) {
      songTitles.push(song.data().title);
    }
  }

  for (const memberId of roster.memberIds || []) {
    const member = await db
      .collection('members')
      .doc(String(memberId))
      .get();

    const userId = member.exists
      ? member.data().accountUid || member.id
      : String(memberId);

    const logId =
      `${rosterDoc.id}_${userId}_${moment.key}`;

    const previousLog = await db
      .collection('notificationLogs')
      .doc(logId)
      .get();

    if (previousLog.exists) continue;

    const devices = await db
      .collection('users')
      .doc(userId)
      .collection('devices')
      .where('enabled', '==', true)
      .get();

    const tokens = devices.docs
      .map(doc => doc.data().token)
      .filter(Boolean);

    if (!tokens.length) continue;

    const body =
      `${roster.service} — ${moment.label}.` +
      `${songTitles.length
        ? ` Ensaiar: ${songTitles.join(', ')}.`
        : ''} ${roster.reminder || ''}`;

    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: 'Lembrete de escala — CEP',
        body: body.slice(0, 500)
      },
      data: {
        url: 'https://taynahodlich30-oss.github.io/midiaigreja/',
        rosterId: rosterDoc.id
      },
      webpush: {
        fcmOptions: {
          link: 'https://taynahodlich30-oss.github.io/midiaigreja/'
        }
      }
    });

    if (result.successCount > 0) {
      await db.collection('users').doc(userId).collection('notifications').add({
        type: 'roster', title: 'Lembrete de escala — CEP', body: body.slice(0, 500), rosterId: rosterDoc.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await db
        .collection('notificationLogs')
        .doc(logId)
        .set({
          rosterId: rosterDoc.id,
          userId,
          moment: moment.key,
          sentAt:
            admin.firestore.FieldValue.serverTimestamp(),
          successCount: result.successCount
        });

      sent += result.successCount;
    }
  }
}

console.log(`Notificações enviadas: ${sent}`);
