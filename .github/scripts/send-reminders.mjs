import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT não configurado.");
}

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

const PORTAL_URL =
  "https://taynahodlich30-oss.github.io/midiaigreja/";

async function getUserTokens(uid) {
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("devices")
    .where("enabled", "==", true)
    .get();

  return snapshot.docs
    .map(doc => doc.data().token)
    .filter(Boolean);
}

async function sendNotification(uid, title, body) {
  const tokens = await getUserTokens(uid);

  if (!tokens.length) return;

  const response = await messaging.sendEachForMulticast({
    tokens,

    notification: {
      title,
      body
    },

    data: {
      type: "roster-reminder",
      url: PORTAL_URL
    },

    webpush: {
      fcmOptions: {
        link: PORTAL_URL
      }
    }
  });

  console.log(
    `Notificação enviada para ${uid}: ${response.successCount} aparelho(s).`
  );
}

async function checkRosters() {
  const now = new Date();

  const snapshot = await db
    .collection("rosters")
    .get();

  for (const rosterDoc of snapshot.docs) {
    const roster = rosterDoc.data();

    if (!roster.date) continue;

    let rosterDate;

    if (roster.date.toDate) {
      rosterDate = roster.date.toDate();
    } else {
      rosterDate = new Date(roster.date);
    }

    if (Number.isNaN(rosterDate.getTime())) continue;

    const difference =
      rosterDate.getTime() - now.getTime();

    const hoursUntil =
      difference / (1000 * 60 * 60);

    /*
      Envia lembrete aproximadamente
      24 horas antes da escala.
    */
    if (hoursUntil < 23.75 || hoursUntil > 24.25) {
      continue;
    }

    const members =
      roster.members ||
      roster.team ||
      roster.people ||
      [];

    for (const member of members) {
      const uid =
        typeof member === "string"
          ? member
          : member.uid;

      if (!uid) continue;

      const reminderId =
        `${rosterDoc.id}_${uid}_24h`;

      const reminderRef = db
        .collection("notificationLogs")
        .doc(reminderId);

      const alreadySent =
        await reminderRef.get();

      if (alreadySent.exists) {
        continue;
      }

      const title = "🔔 Lembrete de Escala";

      const body =
        `Você está escalado para ${
          roster.title ||
          roster.name ||
          "um culto"
        } amanhã.`;

      await sendNotification(
        uid,
        title,
        body
      );

      await reminderRef.set({
        rosterId: rosterDoc.id,
        uid,
        type: "24h",
        sentAt:
          admin.firestore.FieldValue.serverTimestamp()
      });

      await db
        .collection("users")
        .doc(uid)
        .collection("notifications")
        .add({
          type: "roster-reminder",
          title,
          body,
          rosterId: rosterDoc.id,
          read: false,
          createdAt:
            admin.firestore.FieldValue.serverTimestamp()
        });
    }
  }
}

await checkRosters();

console.log("Verificação de escalas concluída.");
