const db = require("./db"); // aici ai database.js (MongoDB)
const constants = require("./constants");
const { EmbedBuilder } = require("discord.js");

module.exports = {
    startUnmuteScheduler(client) {
        setInterval(async () => {

            // Luăm mute-urile expirate (MongoDB version)
            db.getDueUnmutes(async (rows) => {
                if (!rows || rows.length === 0) return;

                // Serverul principal
                const guild = client.guilds.cache.get(constants.MAIN_SERVER_ID);
                if (!guild) return;

                for (const mute of rows) {

                    let member;
                    try {
                        member = await guild.members.fetch(mute.userId);
                    } catch {
                        member = null;
                    }

                    // === CHAT MUTE → scoatem rolul ===
                    if (mute.type === "chat") {
                        const muteRole = guild.roles.cache.get(constants.MUTE_ROLE);

                        if (member && muteRole && member.roles.cache.has(muteRole.id)) {
                            await member.roles.remove(muteRole).catch(() => {});
                        }
                    }

                    // === VOICE MUTE → scoatem serverMute ===
                    if (mute.type === "voice") {
                        if (member && member.voice && member.voice.serverMute) {
                            await member.voice.setMute(false, "Mute expirat").catch(() => {});
                        }
                    }

                    // Scoatem din DB (MongoDB version)
                    await db.removeMute(mute.id);

                    // Trimitem DM
                    if (member) {
                        try {
                            const dmEmbed = new EmbedBuilder()
                                .setColor("Green")
                                .setTitle("🔓 Mute ridicat automat")
                                .setDescription(
                                    `Mute-ul tău **${mute.type.toUpperCase()}** a expirat.\n\n` +
                                    `📝 Motiv inițial: **${mute.reason}**`
                                )
                                .setTimestamp();

                            await member.send({ embeds: [dmEmbed] }).catch(() => {});
                        } catch {}
                    }

                    // LOG optional
                    const logChannel = guild.channels.cache.get(constants.SANCTION_LOGS);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("🔓 UNMUTE — Expirat Automat")
                            .setDescription(
                                `👤 User: <@${mute.userId}>\n` +
                                `📝 Tip: **${mute.type} mute**\n` +
                                `⏳ Durată expirată`
                            )
                            .setTimestamp();

                        logChannel.send({ embeds: [logEmbed] });
                    }
                }
            });

        }, 5000); // verifică din 5 în 5 secunde
    }
};
