const db = require('../utils/db');
const durations = require('../utils/durations');
const embeds = require('../utils/embedBuilder');
const perms = require('../utils/permissions');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "vmute",
    async execute(message, args) {

        const ICON = "https://cdn.discordapp.com/attachments/1304968969677045770/1448370644860534934/ChatGPT_Image_10_dec._2025_19_46_12.png";

        // PERMISIUNI
        if (!perms.canWarnMute(message.member)) {
            return message.reply({ embeds: [embeds.error("Eroare", "Nu ai permisiunea să dai vmute.")] });
        }

        // USER
        const user = message.mentions.members.first();
        if (!user)
            return message.reply({ embeds: [embeds.error("Eroare", "Menționează un user.")] });

        // MOTIV & DURATĂ
        const reason = args[1];
        const duration = durations.voice[reason];

        if (!duration) {
            return message.reply({
                embeds: [
                    embeds.error(
                        "Motiv invalid",
                        `Motiv necunoscut.\n📌 Motive valide: \`${Object.keys(durations.voice).join("`, `")}\``
                    )
                ]
            });
        }

        // VERIFICARE VOICE
        if (!user.voice.channel) {
            return message.reply({
                embeds: [embeds.error("Eroare", `${user} nu este într-un voice channel.`)]
            });
        }

        // APLICĂ MUTE
        try {
            await user.voice.setMute(true, reason);
        } catch {
            return message.reply({
                embeds: [embeds.error("Eroare", "Nu pot aplica voice mute (permisiuni insuficiente).")]
            });
        }

        // BAZĂ DE DATE
        await db.addMute(user.id, message.author.id, "voice", reason, duration);
        await db.ensureStaffRecord(message.author.id);

        // 🚀 ADĂUGAT ÎN RAPORT — FĂRĂ SĂ ATINGEM EMBED-UL
        await db.incrementStaffField(message.author.id, "mutesGiven");

        // ---------------------------
        // DM către user — NEMODIFICAT
        // ---------------------------
        const dmEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setThumbnail(ICON)
            .setAuthor({
                name: `Voice Mute | ${user.user.username}`,
                icon_url: user.user.displayAvatarURL({ dynamic: true })
            })
            .addFields(
                { name: "📦 User", value: `${user.user.tag}`, inline: true },
                { name: "🛡️ Staff", value: `${message.author.tag}`, inline: true },
                { name: "⏳ Durată", value: `${duration / 60000}m`, inline: true },
                { name: "🧾 Motiv", value: reason, inline: false }
            )
            .setFooter({ text: `ID: ${user.id} • ${new Date().toLocaleString("ro-RO")}` });

        user.send({ embeds: [dmEmbed] }).catch(() => {});


        // ---------------------------
        // EMBED FINAL ÎN CHAT — EXACT CUM AVEAI
        // ---------------------------
        const finalEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setThumbnail(ICON)
            .setAuthor({
                name: `Voice Mute | ${user.user.username}`,
                icon_url: user.user.displayAvatarURL({ dynamic: true })
            })
            .addFields(
                { name: "📦 User", value: `<@${user.id}>`, inline: true },
                { name: "🛡️ Staff", value: `<@${message.author.id}>`, inline: true },
                { name: "⏳ Durată", value: `${duration / 60000}m`, inline: true },
                { name: "🧾 Motiv", value: reason, inline: false }
            )
            .setFooter({
                text: `ID: ${user.id} • ${new Date().toLocaleString("ro-RO")}`
            });

        return message.channel.send({ embeds: [finalEmbed] });
    }
};
