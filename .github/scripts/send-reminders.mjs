import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT não configurado.");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

const PORTAL_URL =
  "https://taynahodlich30-oss.github.io/midiaigreja/";

const TIME_ZONE = "America/Sao_Paulo";

const IS_MANUAL_TEST =
  process.env.GITHUB_EVENT_NAME === "workflow_dispatch";


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

  /*
    IMPORTANTE:
    Datas do site como:
    2026-09-20T19:00

    representam horário local de São Paulo.
  */

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
  ) {
    return new Date(`${value}:00-03:00`);
  }

  const parsed =
    new Date(value);

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
    .filter(v => v !== undefined && v !== null)
    .map(v => String(v).toLowerCase());

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

  /*
    Se a escala guardar um objeto:
    { uid: "...", accountUid: "..." }
  */

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


  /*
    PRIMEIRO:
    verifica se esse ID já é diretamente
    um documento da coleção users.
  */

  const userDoc = await db
    .collection("users")
    .doc(memberId)
    .get();

  if (userDoc.exists) {
    return memberId;
  }


  /*
    SEGUNDO:
    procura o cadastro correspondente
    na coleção members.
  */

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

    /*
      Evita duplicação caso a mesma pessoa
      apareça mais de uma vez.
    */

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

  /*
    Formato atual correto:
    rosters/{rosterId}/responses/{uid}
  */

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


  /*
    Compatibilidade:
    caso alguma resposta antiga tenha
    sido gravada usando o memberId.
  */

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


  /*
    Última tentativa:
    procura por userId dentro de responses.
  */

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
  // GitHub roda aproximadamente a cada 15 minutos.
  // ====================================================

  if (
    diffMinutes > 45 &&
    diffMinutes <= 60
  ) {
    return "1h";
  }


  // ====================================================
  // MANHÃ DO DIA DO CULTO
  // 08:00 até 08:14
  // ====================================================

  if (
    localKey(now) ===
      localKey(eventDate) &&
    nowMinutes >= 480 &&
    nowMinutes < 495 &&
    diffMinutes > 0
  ) {
    return "morning";
  }


  // ====================================================
  // DIA ANTERIOR
  // 15:00 até 15:14
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
    nowMinutes < 915 &&
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


  if (
    type === "previous-day"
  ) {

    return {
      title:
        "🎵 Você está escalado amanhã",

      body:
        `${service}: ${when}. ` +
        `Confira sua função e a escala no portal.`
    };
  }


  if (
    type === "morning"
  ) {

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
// TESTE MANUAL
// ======================================================

async function runManualTest() {

  console.log(
    "========================================"
  );

  console.log(
    "MODO DE TESTE MANUAL ATIVADO"
  );

  console.log(
    "========================================"
  );


  /*
    Procura todas as escalas futuras.
  */

  const snapshot =
    await db
      .collection("rosters")
      .get();

  const futureRosters = [];


  for (
    const rosterDoc
    of snapshot.docs
  ) {

    const roster =
      rosterDoc.data();

    const eventDate =
      rosterDate(roster);

    if (
      !eventDate ||
      eventDate.getTime() <= Date.now()
    ) {
      continue;
    }

    futureRosters.push({
      id: rosterDoc.id,
      data: roster,
      date: eventDate
    });
  }


  futureRosters.sort(
    (a, b) =>
      a.date.getTime() -
      b.date.getTime()
  );


  console.log(
    `Escalas futuras encontradas: ${futureRosters.length}`
  );


  /*
    Procura a primeira pessoa realmente
    escalada + confirmada + com dispositivo.
  */

  for (
    const roster
    of futureRosters
  ) {

    console.log(
      `Verificando escala ${roster.id} - ` +
      `${formatServiceDate(roster.date)}`
    );


    const rosterUsers =
      await getRosterUsers(
        roster.data
      );


    console.log(
      `Pessoas vinculadas à escala: ${rosterUsers.length}`
    );


    for (
      const person
      of rosterUsers
    ) {

      console.log(
        `Verificando membro ${person.memberId} ` +
        `→ usuário ${person.uid}`
      );


      const confirmation =
        await getConfirmation(
          roster.id,
          person.uid,
          person.memberId
        );


      if (!confirmation.exists) {
        console.log(
          `Usuário ${person.uid}: sem resposta.`
        );

        continue;
      }


      if (!confirmation.confirmed) {
        console.log(
          `Usuário ${person.uid}: resposta encontrada, ` +
          `mas presença não confirmada.`
        );

        continue;
      }


      console.log(
        `Usuário ${person.uid}: PRESENÇA CONFIRMADA.`
      );


      const tokens =
        await getUserTokens(
          person.uid
        );


      if (!tokens.length) {
        console.log(
          `Usuário ${person.uid}: ` +
          `nenhum dispositivo ativo.`
        );

        continue;
      }


      const service =
        roster.data.service ||
        roster.data.title ||
        roster.data.name ||
        "Culto";


      const when =
        formatServiceDate(
          roster.date
        );


      const title =
        "🔔 Teste de lembrete da escala";


      const body =
        `Teste funcionando! Você está ` +
        `confirmado(a) para ${service} — ${when}.`;


      const delivered =
        await sendNotification(
          person.uid,
          title,
          body,
          "roster-reminder-test"
        );


      await savePortalNotification(
        person.uid,
        {
          type:
            "roster-reminder-test",

          title,

          body,

          rosterId:
            roster.id
        }
      );


      console.log(
        "========================================"
      );

      console.log(
        `TESTE CONCLUÍDO`
      );

      console.log(
        `Usuário: ${person.uid}`
      );

      console.log(
        `Entrega push: ${
          delivered ? "SIM" : "NÃO"
        }`
      );

      console.log(
        "========================================"
      );


      /*
        No teste manual envia para apenas
        UMA pessoa confirmada.
      */

      return;
    }
  }


  throw new Error(
    "Não encontrei nenhuma pessoa escalada, " +
    "confirmada e com dispositivo ativo para o teste."
  );
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


    /*
      Resolve os IDs da coleção members
      para os UIDs reais das contas.
    */

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


      /*
        Só envia se a pessoa confirmou.
      */

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


      /*
        ID único para impedir duplicação.
      */

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


      /*
        Registra o lembrete para
        não enviar novamente.
      */

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


      /*
        Salva no sino do portal.
      */

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

if (IS_MANUAL_TEST) {

  await runManualTest();

} else {

  await checkRosters();

}
