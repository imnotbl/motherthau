const { EmbedBuilder } = require("discord.js");
const DB = require("../utils/db");

module.exports = {
    name: "delswarn",
    description: "Elimină ultimul S-Warn acordat unui membru staff.",
    async execute(message, args) {

        const ALLOWED_SWARN_ROLES = [
            "1447946562184548414",
            "1447946410434498632",
            "1447946434660794491"
        ];

        const LOG_CHANNEL_ID = "1447910693733929043";
        const staff = message.member;

        // Permisiuni
        if (!staff.roles.cache.some(r => ALLOWED_SWARN_ROLES.includes(r.id))) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("⛔ Acces refuzat")
                        .setDescription("Nu ai permisiunea de a elimina un S-Warn.")
                ]
            });
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ Eroare")
                        .setDescription("Trebuie să menționezi membrul staff căruia vrei să îi elimini S-Warn.")
                ]
            });
        }

        // ============================================================
        // MONGODB VERSION — FOLOSEȘTE FUNCȚIA EXISTENTĂ deleteLatestSpecialWarn
        // ============================================================
        DB.deleteLatestSpecialWarn(target.id, async (success) => {

            if (!success) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Yellow")
                            .setTitle("⚠️ Niciun S-Warn")
                            .setDescription(`Utilizatorul <@${target.id}> nu are niciun S-Warn.`)
                    ]
                });
            }

            // Obținem numărul actualizat de warnuri
            DB.getSpecialWarnCount(target.id, async (count) => {

                // -------------------------------
                // 📩 DM către persoana vizată
                // -------------------------------
                const dmEmbed = new EmbedBuilder()
                    .setColor("#00cc66")
                    .setTitle("🔔 Un S-Warn ți-a fost eliminat")
                    .setDescription(
                        `👮 Eliminat de: **${message.author.tag}**\n` +
                        `📊 Warn-uri rămase: **${count}/4**`
                    )
                    .setFooter({ text: `ID: ${target.id}` })
                    .setTimestamp();

                try {
                    await target.send({ embeds: [dmEmbed] });
                } catch {
                    console.log(`Nu pot trimite DM lui ${target.user.tag}`);
                }

                // -------------------------------
                // 🟩 Embed răspuns către staff
                // -------------------------------
                const replyEmbed = new EmbedBuilder()
                    .setColor("#00cc66")
                    .setTitle("✅ S-Warn eliminat")
                    .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                    .setDescription(
                        `I-ai eliminat un S-Warn lui <@${target.id}>.\n` +
                        `Acum are **${count}/4**.`
                    )
                    .setTimestamp();

                message.reply({ embeds: [replyEmbed] });

                // -------------------------------
                // 📢 LOG în canalul staff server
                // -------------------------------
                const logEmbed = new EmbedBuilder()
                    .setColor("#ffcc00")
                    .setTitle("⚠️ S-Warn Eliminat")
                    .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                    .setDescription(
                        `👤 Staff vizat: <@${target.id}>\n` +
                        `👮 Eliminat de: <@${staff.id}>\n` +
                        `📊 Warn-uri rămase: **${count}/4**`
                    )
                    .setTimestamp();

                const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    logChannel.send({ embeds: [logEmbed] });
                }
            });
        });
    }
};
