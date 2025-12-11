const { EmbedBuilder } = require("discord.js");
const embeds = require('../utils/embedBuilder');

module.exports = {
    name: "addrole",
    description: "Adaugă un rol unui utilizator (mention, ID, nume)",

    async execute(message, args) {

        const ALLOWED_ROLES = [
            "1447682951557943358",
            "1447683482359824434",
            "1447683673255186563"
        ];

        if (!message.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id))) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Nu ai permisiunea pentru această comandă.")]
            });
        }

        if (args.length < 2) {
            return message.reply({
                embeds: [embeds.error("Format greșit", "Folosește: `#addrole <user> <rol>`")]
            });
        }

        // IDENTIFICARE USER
        let target =
            message.mentions.members.first() ||
            await message.guild.members.fetch(args[0]).catch(() => null);

        if (!target)
            return message.reply({ embeds: [embeds.error("Eroare", "User invalid sau nu e pe server.")] });

        // IDENTIFICARE ROLE
        let role =
            message.mentions.roles.first() ||
            message.guild.roles.cache.get(args[1]) ||
            message.guild.roles.cache.find(r =>
                r.name.toLowerCase() === args.slice(1).join(" ").toLowerCase()
            );

        if (!role)
            return message.reply({
                embeds: [embeds.error("Eroare", "Rolul specificat nu a fost găsit.")]
            });

        if (target.roles.cache.has(role.id))
            return message.reply({
                embeds: [embeds.error("Eroare", "Utilizatorul are deja acest rol.")]
            });

        // APLICĂ ROLUL
        try {
            await target.roles.add(role.id);
        } catch (err) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Nu pot acorda rolul (permisiuni insuficiente).")]
            });
        }

        // LOGO PERSONALIZAT (dreapta sus)
        const LOGO_URL = "https://cdn.discordapp.com/attachments/1304968969677045770/1448370644860534934/ChatGPT_Image_10_dec._2025_19_46_12.png?ex=693b03c7&is=6939b247&hm=fa9d20ecc218a67a2284e339368303e3b2cf96e08e96a42b322e3b560de345a5&"; // pune logo-ul tău

        // EMBED FINAL
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle(`Rol adăugat | ${message.author.username}`)
            .setThumbnail(LOGO_URL) // 🔥 aici apare logo-ul în dreapta sus
            .setDescription(
                `> 🧍‍♂️ **User:** ${target} **|** 🛡 **Staff:** <@${message.author.id}> **|** 🎭 **Rol:** <@&${role.id}>`
            )
            .setFooter({
                text: `ID: ${target.id} • ${new Date().toLocaleString()}`
            });

        await message.reply({ embeds: [embed] });

        // LOG
        const LOG_CHANNEL = "1448360356803121323";
        const log = message.guild.channels.cache.get(LOG_CHANNEL);

        if (log) log.send({ embeds: [embed] });
    }
};
