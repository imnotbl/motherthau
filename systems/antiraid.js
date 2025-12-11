module.exports = (client) => {

    const RAID_LOG = "1447946039775461507";

    // --- DETECTARE CONTURI NOI ---
    client.on("guildMemberAdd", member => {
        const accountAge = Date.now() - member.user.createdTimestamp;
        const ageDays = accountAge / (1000 * 60 * 60 * 24);

        if (ageDays < 5) {
            const log = member.guild.channels.cache.get(RAID_LOG);
            if (log) log.send(`⚠️ **User suspect detectat:** <@${member.id}> | Cont de **${ageDays.toFixed(1)} zile**`);
        }
    });

    // --- DETECTARE JOIN RAID (multi join rapid) ---
    const joinCache = new Map();

    client.on("guildMemberAdd", member => {
        const now = Date.now();
        let data = joinCache.get(member.guild.id) || [];

        data.push(now);
        data = data.filter(ts => now - ts < 15000);
        joinCache.set(member.guild.id, data);

        if (data.length >= 5) {
            const log = member.guild.channels.cache.get(RAID_LOG);
            if (log) log.send(`🚨 **POSIBIL JOIN RAID**: ${data.length} conturi au intrat în ultimele 15s`);
        }
    });

    // --- DETECTARE SPAM TEXT ---
    const messageCache = {};

    client.on("messageCreate", message => {
        if (message.author.bot) return;

        const id = message.author.id;
        if (!messageCache[id]) messageCache[id] = [];

        const now = Date.now();
        messageCache[id].push(now);
        messageCache[id] = messageCache[id].filter(ts => now - ts < 5000);

        if (messageCache[id].length >= 6) {
            const log = message.guild.channels.cache.get(RAID_LOG);
            if (log) log.send(`📛 **SPAM DETECTAT:** <@${message.author.id}> trimite mesaje extrem de rapid!`);

            messageCache[id] = [];
        }
    });

    // --- DETECTARE SPAM VOICE (join-leave rapid) ---
    const voiceCache = {};

    client.on("voiceStateUpdate", (oldS, newS) => {
        const user = newS.member || oldS.member;
        if (!user) return;

        const id = user.id;
        if (!voiceCache[id]) voiceCache[id] = [];

        const now = Date.now();
        voiceCache[id].push(now);
        voiceCache[id] = voiceCache[id].filter(ts => now - ts < 10000);

        if (voiceCache[id].length >= 5) {
            const log = newS.guild.channels.cache.get(RAID_LOG);
            if (log) log.send(`🔊 **VOICE SPAM:** <@${id}> face join/leave repetitiv în voice.`);
        }
    });
};
