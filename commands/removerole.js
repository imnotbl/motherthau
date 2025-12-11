const embeds = require('../utils/embedBuilder');
const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "removerole",
    description: "Șterge un rol de la un utilizator (merge cu @mention, ID, nume rol)",

    async execute(message, args) {

        const ALLOWED_ROLES = [
            "1447682951557943358",
            "1447683482359824434",
            "1447683673255186563"
        ];

        if (!message.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id))) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Nu ai permisiunea de a folosi această comandă.")]
            });
        }

        if (args.length < 2) {
            return message.reply({
                embeds: [embeds.error("Format invalid", "Folosește: `#removerole <user> <rol>`")]
            });
        }

        // =====================================
        // 🔍 USER
        // =====================================

        let target =
            message.mentions.members.first() ||
            await message.guild.members.fetch(args[0]).catch(() => null);

        if (!target) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Utilizator invalid sau nu se află pe server.")]
            });
        }

        // =====================================
        // 🔍 ROLE
        // =====================================

        let role =
            message.mentions.roles.first() ||
            message.guild.roles.cache.get(args[1]) ||
            message.guild.roles.cache.find(r =>
                r.name.toLowerCase() === args.slice(1).join(" ").toLowerCase()
            );

        if (!role) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Rolul specificat nu a fost găsit.")]
            });
        }

        if (!target.roles.cache.has(role.id)) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Utilizatorul nu are acest rol.")]
            });
        }

        // =====================================
        // 🔐 REMOVE ROLE
        // =====================================

        try {
            await target.roles.remove(role.id);
        } catch (err) {
            console.error(err);
            return message.reply({
                embeds: [
                    embeds.error("Eroare", "Nu pot elimina rolul (permisiuni insuficiente sau top prea sus).")
                ]
            });
        }

        // LOGO
        const ICON = "https://cdn.discordapp.com/attachments/1304968969677045770/1448370644860534934/ChatGPT_Image_10_dec._2025_19_46_12.png";

        // =====================================
        // 📌 EMBED — CONFIRMARE (stil premium)
        // =====================================

        const embed = new EmbedBuilder()
            .setColor("#ff4444")
            .setAuthor({
                name: `Rol eliminat | ${message.author.username}`,
                iconURL: ICON
            })
            .setThumbnail(ICON)
            .setDescription(
                `> 🧍‍♂️ **User:** <@${target.id}>  || 🛡 **Staff:** <@${message.author.id}>  || 🎭 **Rol eliminat:** <@&${role.id}>`
            )
            .setFooter({ text: `ID: ${target.id} • ${new Date().toLocaleString()}` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        // =====================================
        // 📥 LOG — Canal 1448360356803121323
        // =====================================

        const LOG_CHANNEL = "1448360356803121323";
        const logChannel = message.guild.channels.cache.get(LOG_CHANNEL);

        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor("#aa0000")
                .setAuthor({
                    name: `Log | Rol eliminat`,
                    iconURL: ICON
                })
                .setThumbnail(ICON)
                .setDescription(
                    `> 🧍‍♂️ **User:** <@${target.id}>  || 🛡 **Staff:** <@${message.author.id}>  || 🎭 **Rol eliminat:** <@&${role.id}>`
                )
                .setFooter({ text: `ID: ${target.id} • ${new Date().toLocaleString()}` })
                .setTimestamp();

            logChannel.send({ embeds: [logEmbed] });
        }
    }
};
