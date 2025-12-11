// events/leaveStaff.js
const { EmbedBuilder } = require("discord.js");

module.exports = (client) => {
    // Rolul de staff principal
    const STAFF_ROLE = "1447684240966815977";
    const LOG_CHANNEL = "1448360356803121323";

    client.on("guildMemberUpdate", async (oldMember, newMember) => {

        const hadStaff = oldMember.roles.cache.has(STAFF_ROLE);
        const hasStaffNow = newMember.roles.cache.has(STAFF_ROLE);

        // dacă nu l-a avut sau încă îl are → nu e remove
        if (!hadStaff || hasStaffNow) return;

        // ================================
        // 📤 TRIMITE DM LA USER
        // ================================

        const dmEmbed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("👋 Mulțumim pentru timpul petrecut în staff!")
            .setDescription(`
Salut **${newMember.user.username}**,  
Am observat că nu mai deții rolul de staff pe server.

Îți mulțumim sincer pentru implicare, ajutor și timpul acordat! ❤️  
Oricând dorești să revii, ușa noastră este deschisă.

**Toate cele bune în continuare!**
            `)
            .setTimestamp();

        try {
            await newMember.send({ embeds: [dmEmbed] });
        } catch (err) {
            console.log(`❌ Nu pot trimite DM la ${newMember.user.tag}`);
        }

        // ================================
        // 📥 LOG ÎN STAFF LOG CHANNEL
        // ================================

        const logChannel = newMember.guild.channels.cache.get(LOG_CHANNEL);

        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor("DarkRed")
                .setTitle("📛 Staff Member Removed")
                .setDescription(`
👤 **User:** <@${newMember.id}>  
📌 **A părăsit staff-ul**  
🕒 ${new Date().toLocaleString()}
                `)
                .setTimestamp();

            logChannel.send({ embeds: [logEmbed] });
        }
    });
};
