const embeds = require('../utils/embedBuilder');
const perms = require('../utils/permissions');
const db = require('../utils/db');
const constants = require('../utils/constants');
const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "vunmute",
    description: "Scoate un membru de la mute pe voice.",
    
    async execute(message, args, client) {

        const ICON = "https://cdn.discordapp.com/attachments/1304968969677045770/1448370644860534934/ChatGPT_Image_10_dec._2025_19_46_12.png";

        // permisiuni
        if (!perms.isTier2(message.member)) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Nu ai acces la această comandă.")]
            });
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Menționează user-ul căruia dorești să îi dai unmute.")]
            });
        }

        if (!target.voice.channel) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Userul nu se află într-un canal voice.")]
            });
        }

        // scoate mute-ul din voce
        try {
            await target.voice.setMute(false, "Voice Unmute by staff");
        } catch {
            return message.reply({
                embeds: [embeds.error("Eroare", "Nu pot scoate mute-ul! Permisiuni insuficiente.")]
            });
        }

        // === MongoDB VERSION ===
        await db.removeVoiceMute(target.id);


        // ----------------------------------------------------------
        // DM premium către user
        // ----------------------------------------------------------
        const dmEmbed = new EmbedBuilder()
            .setColor(0x00cc66)
            .setThumbnail(ICON)
            .setAuthor({
                name: `Voice Unmute | ${target.user.username}`,
                icon_url: target.user.displayAvatarURL({ dynamic: true })
            })
            .addFields(
                { name: "👤 User", value: `${target.user.tag}`, inline: true },
                { name: "👮 Staff", value: `${message.author.tag}`, inline: true },
                { name: "📝 Motiv", value: "Voice unmute", inline: false }
            )
            .setFooter({
                text: `ID: ${target.id} • ${new Date().toLocaleString("ro-RO")}`
            });

        target.send({ embeds: [dmEmbed] }).catch(() => {});


        // ----------------------------------------------------------
        // EMBED în canal
        // ----------------------------------------------------------
        const replyEmbed = new EmbedBuilder()
            .setColor(0x00cc66)
            .setThumbnail(ICON)
            .setAuthor({
                name: `Voice Unmute | ${target.user.username}`,
                icon_url: target.user.displayAvatarURL({ dynamic: true })
            })
            .addFields(
                {
                    name: "📦 User",
                    value: `<@${target.id}>`,
                    inline: true
                },
                {
                    name: "🛡️ Staff",
                    value: `<@${message.author.id}>`,
                    inline: true
                },
                {
                    name: "🧾 Motiv",
                    value: "Voice unmute",
                    inline: false
                }
            )
            .setFooter({
                text: `ID: ${target.id} • ${new Date().toLocaleString("ro-RO")}`
            });

        message.reply({ embeds: [replyEmbed] });


        // ----------------------------------------------------------
        // LOG în canalul SANCTION_LOGS
        // ----------------------------------------------------------
        const log = message.guild.channels.cache.get(constants.SANCTION_LOGS);
        if (log) {
            log.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x00cc66)
                        .setTitle("Voice Unmute efectuat")
                        .setDescription(`👤 **User:** <@${target.id}>\n👮 **Staff:** <@${message.author.id}>`)
                ]
            });
        }
    }
};
