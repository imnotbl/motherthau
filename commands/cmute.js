const db = require('../utils/db');
const durations = require('../utils/durations');
const embeds = require('../utils/embedBuilder');
const perms = require('../utils/permissions');
const constants = require('../utils/constants');
const { EmbedBuilder } = require('discord.js');

const ICON_URL = "https://cdn.discordapp.com/attachments/1304968969677045770/1448370644860534934/ChatGPT_Image_10_dec._2025_19_46_12.png";

module.exports = {
    name: "cmute",
    async execute(message, args) {

        // Permisiuni staff
        if (!perms.canWarnMute(message.member)) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Nu ai permisiunea să dai cmute.")]
            });
        }

        const user = message.mentions.members.first();
        if (!user)
            return message.reply({
                embeds: [embeds.error("Eroare", "Menționează un user.")]
            });

        const reason = args[1];
        const duration = durations.chat[reason];

        if (!duration) {
            return message.reply({
                embeds: [
                    embeds.error(
                        "Motiv invalid",
                        `Motiv necunoscut.\n📌 Motive valide: \`${Object.keys(durations.chat).join("`, `")}\``
                    )
                ]
            });
        }

        const muteRole = message.guild.roles.cache.get(constants.MUTE_ROLE);
        if (!muteRole)
            return message.reply({
                embeds: [embeds.error("Eroare", "Rolul de mute nu există pe server.")]
            });

        // Aplicăm mute
        await user.roles.add(muteRole).catch(err => console.error(err));

        // Salvăm în DB
        await db.addMute(user.id, message.author.id, "chat", reason, duration);

        // ============================================================
        // 📊 Incrementăm Mutes în raport
        // ============================================================
        await db.ensureStaffRecord(message.author.id);
        await db.incrementStaffField(message.author.id, "mutesGiven");

        // ============================================================
        // 📩 DM PREMIUM CĂTRE USER
        // ============================================================
        const dmEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setThumbnail(ICON_URL)
            .setAuthor({
                name: `Chat Mute | ${user.user.username}`,
                icon_url: user.user.displayAvatarURL({ dynamic: true })
            })
            .addFields(
                { name: "📦 User", value: `${user.user.tag}`, inline: true },
                { name: "🛡️ Staff", value: `${message.author.tag}`, inline: true },
                { name: "⏳ Durată", value: `${duration / 60000} minute`, inline: true },
                { name: "🧾 Motiv", value: reason, inline: false }
            )
            .setFooter({ text: `ID: ${user.id} • ${new Date().toLocaleString("ro-RO")}` });

        try { await user.send({ embeds: [dmEmbed] }); } catch {}


        // ============================================================
        // 🔥 EMBED PREMIUM TRIMIS PE CHAT
        // ============================================================
        const chatEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setThumbnail(ICON_URL)
            .setAuthor({
                name: `Chat Mute | ${user.user.username}`,
                icon_url: user.user.displayAvatarURL({ dynamic: true })
            })
            .addFields(
                {
                    name: "📦 User",
                    value: `<@${user.id}>`,
                    inline: true
                },
                {
                    name: "🛡️ Staff",
                    value: `<@${message.author.id}>`,
                    inline: true
                },
                {
                    name: "⏳ Durată",
                    value: `${duration / 60000} minute`,
                    inline: true
                },
                {
                    name: "🧾 Motiv",
                    value: reason,
                    inline: false
                }
            )
            .setFooter({
                text: `ID: ${user.id} • ${new Date().toLocaleString("ro-RO")}`
            });

        message.reply({ embeds: [chatEmbed] });

        // ============================================================
        // 📌 LOG SANCTION_LOGS (opțional)
        // ============================================================
        const log = message.guild.channels.cache.get(constants.SANCTION_LOGS);

        if (log) {
            const logEmbed = new EmbedBuilder()
                .setColor(0xff6600)
                .setThumbnail(ICON_URL)
                .setAuthor({
                    name: `Chat Mute | ${user.user.username}`,
                    icon_url: user.user.displayAvatarURL({ dynamic: true })
                })
                .addFields(
                    { name: "📦 User", value: `<@${user.id}>`, inline: true },
                    { name: "🛡️ Staff", value: `<@${message.author.id}>`, inline: true },
                    { name: "⏳ Durată", value: `${duration / 60000} minute`, inline: true },
                    { name: "🧾 Motiv", value: reason, inline: false }
                )
                .setFooter({ text: `ID: ${user.id} • ${new Date().toLocaleString("ro-RO")}` });

            log.send({ embeds: [logEmbed] });
        }
    }
};
