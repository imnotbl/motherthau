const db = require("../utils/db");

// userId → timestamp când a început ultimul minut activ
const activeSessions = new Map();

// CANALE STAFF
const STAFF_VOICE_CHANNELS = [
    "1447682897694691504",
    "1447711155371118783",
    "1448395956457308220",
    "1448395978489987082",
    "1448395992096575651",
    "1448396001126650038",
    "1448396038212816977",
    "1448396080403320832",
    "1448396099609038858",
    "1448396114586763344"
];

const ONE_MIN = 60 * 1000;

module.exports = (client) => {

    // 🟦 Verifică dacă membrul este în voice activ și valid
    function isActive(state) {
        return (
            state.channelId &&
            STAFF_VOICE_CHANNELS.includes(state.channelId) &&
            !state.selfMute &&
            !state.selfDeaf &&
            !state.serverMute &&
            !state.serverDeaf
        );
    }

    client.on("voiceStateUpdate", async (oldState, newState) => {
        const user = newState.member;
        if (!user) return;

        const userId = user.id;
        await db.ensureStaffRecord(userId);
        const now = Date.now();

        const wasActive = isActive(oldState);
        const isNowActive = isActive(newState);

        // 🟥 1. Ieșire din voice sau devine mute/deaf → stop sesiune
        if (wasActive && !isNowActive) {
            activeSessions.delete(userId);
            return;
        }

        // 🟩 2. Intră în voice staff activ → începe sesiune
        if (!wasActive && isNowActive) {
            activeSessions.set(userId, now);
            return;
        }

        // 🔄 3. Schimbă canalul: dacă noul canal e valid → continuă, altfel oprește
        if (oldState.channelId !== newState.channelId) {
            if (isNowActive) {
                if (!activeSessions.has(userId)) activeSessions.set(userId, now);
            } else {
                activeSessions.delete(userId);
            }
            return;
        }

        // 🔁 4. Dacă era inactiv și devine activ din nou (ex. unmute)
        if (!wasActive && isNowActive) {
            activeSessions.set(userId, now);
        }
    });

    // 🔄 TIMER GLOBAL — rulează la 10 secunde, contorizează minutele active
    setInterval(async () => {
        const now = Date.now();

        for (const [userId, started] of activeSessions.entries()) {
            if (now - started >= ONE_MIN) {
                await db.addVoiceMinutes(userId, 1);
                activeSessions.set(userId, now);
            }
        }
    }, 10 * 1000);
};
