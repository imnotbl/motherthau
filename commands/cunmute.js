const db = require('../utils/db');
const embeds = require('../utils/embedBuilder');
const perms = require('../utils/permissions');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "cunmute",
    async execute(message, args) {

        const ICON = "https://cdn.discordapp.com/attachments/1304968969677045770/1448370644860534934/ChatGPT_Image_10_dec._2025_19_46_12.png";

        // PERMISIUNI
        if (!perms.canWarnMute(message.member)) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Nu ai permisiunea să dai chat unmute.")]
            });
        }

        // TARGET
        const user = message.mentions.members.first();
        if (!user) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Menționează un user.")]
            });
        }

        // MOTIV
        const reason = args.slice(1).join(" ") || "Nespecificat";

        // ============================================================
        // 🟢 MONGODB — ȘTERGE MUTE-UL DIN DB
        // ============================================================
        await db.removeChatMute(user.id);

        // SCOATERE MUTE REAL (rolul muted)
        const muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
        if (muteRole && user.roles.cache.has(muteRole.id)) {
            try {
                await user.roles.remove(muteRole, "Chat Unmute by staff");
            } catch {
                return message.reply({
                    embeds: [embeds.error("Eroare", "Nu pot scoate rolul Muted (permisiuni insuficiente).")]
                });
            }
        }

        // DM → FINAL PREMIUM
        const dmEmbed = new EmbedBuilder()
            .setColor(0x00cc66)
            .setThumbnail(ICON)
            .setAuthor({
                name: `Chat Unmute | ${user.user.username}`,
                icon_url: user.user.displayAvatarURL({ dynamic: true })
            })
            .addFields(
                { name: "📦 User", value: `${user.user.tag}`, inline: true },
                { name: "🛡️ Staff", value: `${message.author.tag}`, inline: true },
                { name: "🧾 Motiv", value: reason, inline: false }
            )
            .setFooter({ text: `ID: ${user.id} • ${new Date().toLocaleString("ro-RO")}` });

        user.send({ embeds: [dmEmbed] }).catch(() => {});

        // EMBED PREMIUM PE CANAL
        const finalEmbed = new EmbedBuilder()
            .setColor(0x00cc66)
            .setThumbnail(ICON)
            .setAuthor({
                name: `Chat Unmute | ${user.user.username}`,
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
                    name: "🧾 Motiv",
                    value: reason,
                    inline: false
                }
            )
            .setFooter({
                text: `ID: ${user.id} • ${new Date().toLocaleString("ro-RO")}`
            });

        return message.channel.send({ embeds: [finalEmbed] });
    }
};
