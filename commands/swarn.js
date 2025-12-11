const { EmbedBuilder } = require("discord.js");
const db = require("../utils/db");
const embeds = require("../utils/embedBuilder");

module.exports = {
    name: "swarn",
    description: "Aplică un Staff Warn unui membru staff.",
    async execute(message, args, client) {

        const ALLOWED_SWARN_ROLES = [
            "1447946562184548414",
            "1447946410434498632",
            "1447946434660794491"
        ];

        const LOG_CHANNEL = "1447910693733929043";
        const STAFF_SERVER_ID = "1447896446203596905";

        const ICON = "https://cdn.discordapp.com/attachments/1304968969677045770/1448375633368322280/ChatGPT_Image_10_dec._2025_20_07_24.png";

        // Permisiuni
        if (!message.member.roles.cache.some(r => ALLOWED_SWARN_ROLES.includes(r.id))) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("Red")
                    .setThumbnail(ICON)
                    .setTitle("❌ Eroare")
                    .setDescription("Nu ai permisiunea de a acorda un S-Warn.")]
            });
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("Red")
                    .setThumbnail(ICON)
                    .setTitle("❌ Eroare")
                    .setDescription("Menționează un membru staff.")]
            });
        }

        const reason = args.slice(1).join(" ");
        if (!reason) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("Red")
                    .setThumbnail(ICON)
                    .setTitle("❌ Eroare")
                    .setDescription("Trebuie să specifici un motiv.")]
            });
        }

        // ADD special warn
        await db.addSpecialWarn(target.id, message.author.id, reason);

        db.getSpecialWarnCount(target.id, async (count) => {

            const expireDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
            const expireText = expireDate.toLocaleDateString("ro-RO");

            // 📩 DM
            const dmEmbed = new EmbedBuilder()
                .setColor("#ff0000")
                .setAuthor({
                    name: "⚠️ Staff Warn (awoken staff)",
                    iconURL: ICON
                })
                .setThumbnail(ICON)
                .setDescription(
                    `Ai primit un staff warn ❗\n\n` +
                    `**Motiv:** ${reason}\n` +
                    `**Warn:** ${count}/4\n\n` +
                    `Expiră: **${expireText}**`
                )
                .setTimestamp();

            target.send({ embeds: [dmEmbed] }).catch(() => {});

            // Public embed
            const publicEmbed = new EmbedBuilder()
                .setColor("Orange")
                .setThumbnail(ICON)
                .setTitle(`⚠️ S-Warn aplicat — ${target.user.username}`)
                .addFields(
                    { name: "👤 Staff sancționat", value: `<@${target.id}>`, inline: true },
                    { name: "👮 Aplicat de", value: `<@${message.author.id}>`, inline: true },
                    { name: "📄 Motiv", value: reason, inline: false },
                    { name: "📊 Total Warn-uri", value: `${count}/4`, inline: true },
                    { name: "⏳ Expiră la", value: expireText, inline: true }
                )
                .setFooter({ text: `ID: ${target.id}` })
                .setTimestamp();

            message.reply({ embeds: [publicEmbed] });

            // LOG
            const log = message.guild.channels.cache.get(LOG_CHANNEL);
            if (log) {
                const logEmbed = new EmbedBuilder()
                    .setColor("Orange")
                    .setThumbnail(ICON)
                    .setTitle("⚠️ Staff Warn aplicat")
                    .setDescription(
                        `👤 **Staff:** <@${target.id}>\n` +
                        `👮 **Aplicat de:** <@${message.author.id}>\n` +
                        `📄 **Motiv:** ${reason}\n` +
                        `📊 **Total:** ${count}/4\n` +
                        `⏳ **Expiră la:** ${expireText}`
                    )
                    .setTimestamp();

                log.send({ embeds: [logEmbed] });
            }

            // ======================================================
            // 🚨 Eliminare automată la 4/4 warn
            // ======================================================
            if (count >= 4) {

                const staffGuild = client.guilds.cache.get(STAFF_SERVER_ID);

                if (staffGuild) {
                    const staffMember = staffGuild.members.cache.get(target.id);
                    if (staffMember) {
                        await staffMember.kick("4/4 S-Warn – Eliminat din staff").catch(() => {});
                    }
                }

                // RESET MongoDB VERSION 👍
                await db.resetSpecialWarns(target.id);

                if (log) {
                    const outEmbed = new EmbedBuilder()
                        .setColor("DarkRed")
                        .setThumbnail(ICON)
                        .setTitle("🚨 STAFF OUT — 4/4 S-Warn")
                        .setDescription(
                            `🚨 <@${target.id}> a fost eliminat de pe serverul staff.\n` +
                            `⚠️ Toate S-Warn-urile au fost resetate automat.`
                        )
                        .setTimestamp();

                    log.send({ embeds: [outEmbed] });
                }

                message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("DarkRed")
                            .setThumbnail(ICON)
                            .setTitle("🚨 Eliminare automată staff")
                            .setDescription(
                                `🚨 <@${target.id}> a fost **eliminat din staff** pentru că a acumulat **4/4 S-Warn-uri**.\n` +
                                `🔁 Warn-urile au fost resetate.`
                            )
                    ]
                });
            }
        });
    }
};
