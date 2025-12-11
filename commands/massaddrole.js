const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'massaddrole',
    description: 'Adaugă un rol tuturor membrilor (FULL ACCESS ONLY)',
    async execute(message, args, client) {

        const FULL_ACCESS_ROLES = [
            "1447682951557943358", // Full Access
        ];

        const LOG_CHANNEL = "1448360356803121323"; // log add/remove role
        const LOGO_URL = "https://i.ibb.co/QcF7cZy/awoken-logo.png"; // pune logo-ul tău aici

        // permisiuni
        if (!message.member.roles.cache.some(r => FULL_ACCESS_ROLES.includes(r.id)))
            return message.reply("❌ Nu ai acces la această comandă.");

        // rol
        const roleId = args[0];
        if (!roleId)
            return message.reply("❌ Format corect: `#massaddrole <idrol>`");

        const role = message.guild.roles.cache.get(roleId);
        if (!role)
            return message.reply("❌ Rolul nu a fost găsit.");

        // mesaj de start
        await message.channel.send(`⏳ Încep distribuirea rolului **${role.name}** la toți membrii serverului...`);

        let added = 0;
        let skipped = 0;

        const members = await message.guild.members.fetch();

        for (const member of members.values()) {

            if (member.user.bot) {
                skipped++;
                continue;
            }

            if (member.roles.cache.has(role.id)) {
                skipped++;
                continue;
            }

            try {
                await member.roles.add(role);
                added++;
            } catch {
                skipped++;
            }

            await new Promise(res => setTimeout(res, 250)); // protect rate limit
        }

        // ==========================
        // ✅ EMBED FINAL
        // ==========================

        const resultEmbed = new EmbedBuilder()
            .setColor("#22c55e")
            .setAuthor({
                name: `Rol distribuit în masă | ${message.author.username}`,
                iconURL: LOGO_URL
            })
            .setDescription(
                `> 🎭 **Rol distribuit:** <@&${role.id}>\n` +
                `> 🛡 **Executat de:** <@${message.author.id}>\n\n` +
                `> 👥 **Membri actualizați:** **${added}**\n` +
                `> ⚠️ **Săriți / eroare:** **${skipped}**\n`
            )
            .setFooter({ text: `ID Staff: ${message.author.id}` })
            .setTimestamp();

        await message.channel.send({ embeds: [resultEmbed] });

        // ==========================
        // 📥 LOG ÎN STAFF LOGS
        // ==========================

        const logChannel = message.guild.channels.cache.get(LOG_CHANNEL);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor("#3b82f6")
                .setAuthor({
                    name: `Log | Mass Role Add`,
                    iconURL: LOGO_URL
                })
                .setDescription(
                    `> 🎭 **Rol adăugat:** <@&${role.id}>\n` +
                    `> 👮 **Executat de:** <@${message.author.id}>\n` +
                    `> 👥 **Membri actualizați:** **${added}**\n` +
                    `> ⚠️ **Săriți / eroare:** **${skipped}**`
                )
                .setTimestamp();

            logChannel.send({ embeds: [logEmbed] });
        }
    }
};
