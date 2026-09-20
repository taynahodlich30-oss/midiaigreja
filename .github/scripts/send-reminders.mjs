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

const TIME_ZONE = "America/Sao_Paulo";


// ======================================================
// DATA / HORÁRIO DE SÃO PAULO
// ======================================================

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

  return Object.fromEntries(
    parts.map(p => [p.type, p.value])
  );
}

function localKey(date = new Date()) {
  const p = partsInSaoPaulo(date);

  return `${p.year}-${p.month}-${p.day}`;
}


// ======================================================
// CONVERTE A DATA DA ESCALA
// ======================================================

function rosterDate(roster) {
  if (!roster.dateTime && !roster.date) {
    return null;
  }

  const value =
    roster.dateTime || roster.date;

  if (value?.toDate) {
    return value.toDate();
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
  ) {
    return new Date(`${value}:00-03:00`);
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}


// ======================================================
// FORMATA DATA DO CULTO
// ======================================================

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


// ======================================================
// TOKENS DOS CELULARES
// ======================================================

async function getUserTokens(uid) {
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists || userDoc.data().accessDisabled === true) return [];

  const snapshot = await userRef
    .collection("devices")
    .where("enabled", "==", true)
    .get();

  return snapshot.docs
    .map(doc => doc.data().token)
    .filter(Boolean);
}


// ======================================================
// ENVIA PUSH
// ======================================================

async function sendNotification(
  uid,
  title,
  body,
  type = "roster-reminder"
) {
  const tokens =
    await getUserTokens(uid);

  if (!tokens.length) {
    console.log(
      `Sem dispositivo ativo para ${uid}.`
    );

    return false;
  }

  const response =
    await messaging.sendEachForMulticast({
      tokens,

      notification: {
        title,
        body
      },

      data: {
        type,
        url: PORTAL_URL
      },

      webpush: {
        fcmOptions: {
          link: PORTAL_URL
        }
      }
    });

  console.log(
    `Notificação enviada para ${uid}: ` +
    `${response.successCount} aparelho(s).`
  );

  if (response.failureCount > 0) {
    console.log(
      `Falhas no envio: ${response.failureCount}.`
    );
  }

  return response.successCount > 0;
}


// ======================================================
// VERIFICA SE UMA RESPOSTA É CONFIRMADA
// ======================================================

function isConfirmedResponse(response = {}) {
  if (response.confirmed === true) {
    return true;
  }

  const values = [
    response.status,
    response.attendance,
    response.response,
    response.answer
  ]
    .filter(
      v => v !== undefined && v !== null
    )
    .map(
      v => String(v).toLowerCase()
    );

  const accepted = [
    "confirmed",
    "confirmado",
    "confirmada",
    "yes",
    "sim",
    "accepted",
    "aceito",
    "aceita",
    "present",
    "presente"
  ];

  return values.some(
    value => accepted.includes(value)
  );
}


// ======================================================
// DESCOBRE O UID DA CONTA DE UM MEMBRO
// ======================================================

async function resolveMemberUid(member) {
  if (
    member &&
    typeof member === "object"
  ) {
    const directUid =
      member.accountUid ||
      member.userId ||
      member.uid ||
      member.authUid;

    if (directUid) {
      return directUid;
    }

    member =
      member.memberId ||
      member.id;
  }

  if (!member) {
    return null;
  }

  const memberId =
    String(member);

  // Primeiro verifica se o ID já é um usuário.

  const userDoc = await db
    .collection("users")
    .doc(memberId)
    .get();

  if (userDoc.exists) {
    return memberId;
  }

  // Depois procura o cadastro em members.

  const memberDoc = await db
    .collection("members")
    .doc(memberId)
    .get();

  if (!memberDoc.exists) {
    console.log(
      `Membro ${memberId} não encontrado em members nem users.`
    );

    return null;
  }

  const data =
    memberDoc.data() || {};

  const uid =
    data.accountUid ||
    data.userId ||
    data.uid ||
    data.authUid ||
    null;

  if (!uid) {
    console.log(
      `Membro ${memberId} não possui conta vinculada.`
    );

    return null;
  }

  return uid;
}


// ======================================================
// RETORNA OS USUÁRIOS ESCALADOS
// ======================================================

async function getRosterUsers(roster) {
  const members =
    roster.memberIds ||
    roster.members ||
    roster.team ||
    roster.people ||
    [];

  const users = [];

  for (const member of members) {
    const memberId =
      typeof member === "string"
        ? member
        : (
            member.memberId ||
            member.id ||
            member.uid ||
            null
          );

    const uid =
      await resolveMemberUid(member);

    if (!uid) {
      continue;
    }

    // Evita duplicação.

    if (
      users.some(
        item => item.uid === uid
      )
    ) {
      continue;
    }

    users.push({
      uid,
      memberId
    });
  }

  return users;
}


// ======================================================
// PROCURA A CONFIRMAÇÃO DO USUÁRIO
// ======================================================

async function getConfirmation(
  rosterId,
  uid,
  memberId = null
) {
  // Formato atual:
  // rosters/{rosterId}/responses/{uid}

  let responseDoc = await db
    .collection("rosters")
    .doc(rosterId)
    .collection("responses")
    .doc(uid)
    .get();

  if (responseDoc.exists) {
    return {
      exists: true,

      confirmed:
        isConfirmedResponse(
          responseDoc.data()
        ),

      data:
        responseDoc.data()
    };
  }

  // Compatibilidade com respostas antigas.

  if (
    memberId &&
    memberId !== uid
  ) {
    responseDoc = await db
      .collection("rosters")
      .doc(rosterId)
      .collection("responses")
      .doc(memberId)
      .get();

    if (responseDoc.exists) {
      return {
        exists: true,

        confirmed:
          isConfirmedResponse(
            responseDoc.data()
          ),

        data:
          responseDoc.data()
      };
    }
  }

  // Última tentativa: procura pelo userId.

  const responseQuery = await db
    .collection("rosters")
    .doc(rosterId)
    .collection("responses")
    .where("userId", "==", uid)
    .limit(1)
    .get();

  if (!responseQuery.empty) {
    const data =
      responseQuery.docs[0].data();

    return {
      exists: true,

      confirmed:
        isConfirmedResponse(data),

      data
    };
  }

  return {
    exists: false,
    confirmed: false,
    data: null
  };
}


// ======================================================
// HORÁRIOS DOS LEMBRETES
// ======================================================

function reminderDue(
  now,
  eventDate
) {
  const nowP =
    partsInSaoPaulo(now);

  const nowMinutes =
    Number(nowP.hour) * 60 +
    Number(nowP.minute);

  const diffMinutes =
    (
      eventDate.getTime() -
      now.getTime()
    ) / 60000;


  // ====================================================
  // 1 HORA ANTES
  //
  // Janela de segurança:
  // entre 30 e 75 minutos antes.
  //
  // O notificationLogs impede que o mesmo lembrete
  // seja processado novamente.
  // ====================================================

  if (
    diffMinutes > 30 &&
    diffMinutes <= 75
  ) {
    return "1h";
  }


  // ====================================================
  // MANHÃ DO DIA DO CULTO
  //
  // Janela: 08:00 até 08:59
  // ====================================================

  if (
    localKey(now) ===
      localKey(eventDate) &&
    nowMinutes >= 480 &&
    nowMinutes < 540 &&
    diffMinutes > 0
  ) {
    return "morning";
  }


  // ====================================================
  // DIA ANTERIOR
  //
  // Janela: 15:00 até 15:59
  // ====================================================

  const tomorrow =
    new Date(
      now.getTime() +
      24 * 60 * 60 * 1000
    );

  if (
    localKey(tomorrow) ===
      localKey(eventDate) &&
    nowMinutes >= 900 &&
    nowMinutes < 960 &&
    diffMinutes > 0
  ) {
    return "previous-day";
  }


  return null;
}


// ======================================================
// TEXTO DOS LEMBRETES
// ======================================================

function messageFor(
  type,
  roster,
  eventDate
) {
  const service =
    roster.service ||
    roster.title ||
    roster.name ||
    "Culto";

  const when =
    formatServiceDate(eventDate);

  if (type === "previous-day") {
    return {
      title:
        "🎵 Você está escalado amanhã",

      body:
        `${service}: ${when}. ` +
        `Confira sua função e a escala no portal.`
    };
  }

  if (type === "morning") {
    return {
      title:
        "☀️ Hoje é dia de culto",

      body:
        `Você está escalado para ${service} — ${when}. ` +
        `Confira sua escala.`
    };
  }

  return {
    title:
      "⏰ Falta 1 hora para o culto",

    body:
      `Você está escalado para ${service}. ` +
      `Confira sua função e prepare-se para servir.`
  };
}


// ======================================================
// SALVA NO SINO DO SITE
// ======================================================

async function savePortalNotification(
  uid,
  data
) {
  await db
    .collection("users")
    .doc(uid)
    .collection("notifications")
    .add({
      ...data,

      read: false,

      createdAt:
        admin.firestore.FieldValue
          .serverTimestamp()
    });
}


// ======================================================
// LEMBRETES AUTOMÁTICOS
// ======================================================

async function checkRosters() {
  const now =
    new Date();

  console.log(
    `Iniciando verificação: ${
      formatServiceDate(now)
    }`
  );

  const snapshot =
    await db
      .collection("rosters")
      .get();

  let sent = 0;
  let checked = 0;

  for (
    const rosterDoc
    of snapshot.docs
  ) {
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

    checked++;

    console.log(
      `Escala dentro da janela de lembrete: ` +
      `${rosterDoc.id} - ${type}`
    );

    const rosterUsers =
      await getRosterUsers(
        roster
      );

    console.log(
      `Usuários vinculados: ${rosterUsers.length}`
    );

    for (
      const person
      of rosterUsers
    ) {
      const uid =
        person.uid;

      // Só envia se a presença estiver confirmada.

      const confirmation =
        await getConfirmation(
          rosterDoc.id,
          uid,
          person.memberId
        );

      if (
        !confirmation.exists ||
        !confirmation.confirmed
      ) {
        console.log(
          `Ignorando ${uid}: ` +
          `presença não confirmada.`
        );

        continue;
      }

      // ID único para impedir lembrete duplicado.

      const reminderId =
        `${rosterDoc.id}_` +
        `${uid}_` +
        `${type}_` +
        `${localKey(eventDate)}`;

      const reminderRef =
        db
          .collection(
            "notificationLogs"
          )
          .doc(
            reminderId
          );

      const existing =
        await reminderRef.get();

      if (existing.exists) {
        console.log(
          `Lembrete já processado para ${uid}.`
        );

        continue;
      }

      const {
        title,
        body
      } =
        messageFor(
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

      // Registra para não enviar novamente.

      await reminderRef.set({
        rosterId:
          rosterDoc.id,

        uid,

        memberId:
          person.memberId || null,

        type,

        delivered,

        eventDate:
          admin.firestore.Timestamp
            .fromDate(
              eventDate
            ),

        sentAt:
          admin.firestore.FieldValue
            .serverTimestamp()
      });

      // Salva também na Central do portal.

      await savePortalNotification(
        uid,
        {
          type:
            "roster-reminder",

          title,

          body,

          rosterId:
            rosterDoc.id,

          reminderType:
            type
        }
      );

      if (delivered) {
        sent++;
      }
    }
  }

  console.log(
    "========================================"
  );

  console.log(
    `Escalas na janela de aviso: ${checked}`
  );

  console.log(
    `Lembretes enviados: ${sent}`
  );

  console.log(
    "========================================"
  );
}


// ======================================================
// EXECUÇÃO
// ======================================================

await checkRosters();
