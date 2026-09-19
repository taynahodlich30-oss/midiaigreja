import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT não configurado.");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const messaging = admin.messaging();

const PORTAL_URL = "https://taynahodlich30-oss.github.io/midiaigreja/";
const TIME_ZONE = "America/Sao_Paulo";

// Sua conta será usada somente quando você clicar manualmente em Run workflow
const TEST_EMAIL = "taynahodlich30@gmail.com";
const IS_MANUAL_TEST = process.env.GITHUB_EVENT_NAME === "workflow_dispatch";

function partsInSaoPaulo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}

function localKey(date = new Date()) {
  const p = partsInSaoPaulo(date);
  return `${p.year}-${p.month}-${p.day}`;
}

function rosterDate(roster) {
  if (!roster.dateTime && !roster.date) return null;

  const value = roster.dateTime || roster.date;

  if (value?.toDate) {
    return value.toDate();
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function formatServiceDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

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

  if (!tokens.length) {
    console.log(`Sem dispositivo ativo para ${uid}.`);
    return false;
  }

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

  return response.successCount > 0;
}

function reminderDue(now, eventDate) {
  const nowP = partsInSaoPaulo(now);

  const nowMinutes =
    Number(nowP.hour) * 60 +
    Number(nowP.minute);

  const diffMinutes =
    (eventDate.getTime() - now.getTime()) / 60000;

  // ==========================
  // 1 HORA ANTES DO CULTO
  // ==========================

  if (
    diffMinutes > 45 &&
    diffMinutes <= 60
  ) {
    return "1h";
  }

  // ==========================
  // MANHÃ DO DIA DO CULTO
  // 08:00 até 08:14
  // ==========================

  if (
    localKey(now) === localKey(eventDate) &&
    nowMinutes >= 480 &&
    nowMinutes < 495 &&
    diffMinutes > 0
  ) {
    return "morning";
  }

  // ==========================
  // DIA ANTERIOR
  // 15:00 até 15:14
  // ==========================

  const tomorrow =
    new Date(
      now.getTime() +
      24 * 60 * 60 * 1000
    );

  if (
    localKey(tomorrow) === localKey(eventDate) &&
    nowMinutes >= 900 &&
    nowMinutes < 915
  ) {
    return "previous-day";
  }

  return null;
}

function messageFor(type, roster, eventDate) {
  const service =
    roster.service ||
    roster.title ||
    roster.name ||
    "culto";

  const when =
    formatServiceDate(eventDate);

  if (type === "previous-day") {
    return {
      title: "🎵 Você está escalado amanhã",
      body:
        `${service}: ${when}. ` +
        `Confira sua função e a escala no portal.`
    };
  }

  if (type === "morning") {
    return {
      title: "☀️ Hoje é dia de culto",
      body:
        `Você está escalado para ${service} — ${when}. ` +
        `Confira sua escala.`
    };
  }

  return {
    title: "⏰ Falta 1 hora para o culto",
    body:
      `Você está escalado para ${service}. ` +
      `Confira sua função e prepare-se para servir.`
  };
}

// ======================================================
// TESTE MANUAL
// Só funciona quando você clicar em Run workflow
// ======================================================

async function runManualTest() {
  console.log("Modo de teste manual ativado.");

  // Procura sua conta
  const userSnap = await db
    .collection("users")
    .where("email", "==", TEST_EMAIL)
    .limit(1)
    .get();

  if (userSnap.empty) {
    throw new Error(
      `Usuária de teste não encontrada: ${TEST_EMAIL}`
    );
  }

  const userDoc = userSnap.docs[0];
  const uid = userDoc.id;

  console.log(`Usuária de teste encontrada: ${uid}`);

  // Procura escalas futuras
  const futureRosters = [];

  const rostersSnap =
    await db.collection("rosters").get();

  for (const doc of rostersSnap.docs) {
    const data = doc.data();
    const date = rosterDate(data);

    if (
      date &&
      date.getTime() > Date.now()
    ) {
      futureRosters.push({
        id: doc.id,
        data,
        date
      });
    }
  }

  futureRosters.sort(
    (a, b) => a.date - b.date
  );

  let selected = null;

  // Procura uma escala que você confirmou
  for (const roster of futureRosters) {
    const responseDoc = await db
      .collection("rosters")
      .doc(roster.id)
      .collection("responses")
      .doc(uid)
      .get();

    if (!responseDoc.exists) {
      continue;
    }

    const response =
      responseDoc.data() || {};

    const value = String(
      response.status ??
      response.response ??
      response.answer ??
      response.confirmed ??
      ""
    ).toLowerCase();

    const confirmed =
      response.confirmed === true ||
      [
        "confirmed",
        "confirmado",
        "confirmada",
        "yes",
        "sim",
        "accepted",
        "aceito",
        "aceita",
        "present"
      ].includes(value);

    if (confirmed) {
      selected = roster;
      break;
    }
  }

  if (!selected) {
    throw new Error(
      "Não encontrei uma escala futura confirmada para a usuária de teste."
    );
  }

  const service =
    selected.data.service ||
    selected.data.title ||
    selected.data.name ||
    "culto";

  const when =
    formatServiceDate(selected.date);

  console.log(
    `Escala encontrada: ${selected.id} - ${service} - ${when}`
  );

  const title =
    "🔔 Teste de lembrete da escala";

  const body =
    `Teste funcionando! Você está confirmada ` +
    `para ${service} — ${when}.`;

  const delivered =
    await sendNotification(
      uid,
      title,
      body
    );

  // Também salva dentro das notificações do portal
  await db
    .collection("users")
    .doc(uid)
    .collection("notifications")
    .add({
      type: "roster-reminder-test",
      title,
      body,
      rosterId: selected.id,
      read: false,
      createdAt:
        admin.firestore.FieldValue.serverTimestamp()
    });

  console.log(
    `Teste manual concluído. Entrega push: ${
      delivered ? "SIM" : "NÃO"
    }.`
  );
}

// ======================================================
// LEMBRETES AUTOMÁTICOS
// ======================================================

async function checkRosters() {
  const now = new Date();

  const snapshot =
    await db.collection("rosters").get();

  let sent = 0;

  for (const rosterDoc of snapshot.docs) {
    const roster =
      rosterDoc.data();

    const eventDate =
      rosterDate(roster);

    if (!eventDate) {
      continue;
    }

    const type =
      reminderDue(
        now,
        eventDate
      );

    if (!type) {
      continue;
    }

    const members =
      roster.memberIds ||
      roster.members ||
      roster.team ||
      roster.people ||
      [];

    for (const member of members) {
      const uid =
        typeof member === "string"
          ? member
          : (member.uid || member.id);

      if (!uid) {
        continue;
      }

      // ==========================
      // CONFIRMAÇÃO DE PRESENÇA
      // ==========================

      const responseDoc = await db
        .collection("rosters")
        .doc(rosterDoc.id)
        .collection("responses")
        .doc(uid)
        .get();

      // Sem confirmação = sem lembrete
      if (!responseDoc.exists) {
        continue;
      }

      const response =
        responseDoc.data() || {};

      const value = String(
        response.status ??
        response.response ??
        response.answer ??
        response.confirmed ??
        ""
      ).toLowerCase();

      const confirmed =
        response.confirmed === true ||
        [
          "confirmed",
          "confirmado",
          "confirmada",
          "yes",
          "sim",
          "accepted",
          "aceito",
          "aceita",
          "present"
        ].includes(value);

      if (!confirmed) {
        continue;
      }

      // ==========================
      // EVITA NOTIFICAÇÃO DUPLICADA
      // ==========================

      const reminderId =
        `${rosterDoc.id}_` +
        `${uid}_` +
        `${type}_` +
        `${localKey(eventDate)}`;

      const reminderRef =
        db
          .collection("notificationLogs")
          .doc(reminderId);

      const existing =
        await reminderRef.get();

      if (existing.exists) {
        continue;
      }

      const {
        title,
        body
      } = messageFor(
        type,
        roster,
        eventDate
      );

      const delivered =
        await sendNotification(
          uid,
          title,
          body
        );

      // Registra que esse lembrete já foi processado
      await reminderRef.set({
        rosterId:
          rosterDoc.id,

        uid,

        type,

        delivered,

        eventDate:
          admin.firestore.Timestamp.fromDate(
            eventDate
          ),

        sentAt:
          admin.firestore.FieldValue.serverTimestamp()
      });

      // Salva também no sino de notificações do site
      await db
        .collection("users")
        .doc(uid)
        .collection("notifications")
        .add({
          type:
            "roster-reminder",

          title,

          body,

          rosterId:
            rosterDoc.id,

          reminderType:
            type,

          read:
            false,

          createdAt:
            admin.firestore.FieldValue.serverTimestamp()
        });

      if (delivered) {
        sent++;
      }
    }
  }

  console.log(
    `Verificação concluída. Lembretes enviados: ${sent}.`
  );
}

// ======================================================
// DECIDE SE É TESTE OU EXECUÇÃO AUTOMÁTICA
// ======================================================

if (IS_MANUAL_TEST) {
  await runManualTest();
} else {
  await checkRosters();
}
