const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
    PermissionsBitField
} = require("discord.js");

module.exports = {
    name: "setupticket",
    description: "Generează panoul complet pentru sistemul de tickete.",

    async execute(message) {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("❌ Nu ai permisiunea de a genera panoul de tickete.");
        }

        const embed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setTitle("🧾 Sistem Tickete — Awoken")
            .setThumbnail("https://i.imgur.com/8QfSgZB.png") // pune avatarul botului, dacă vrei
            .setDescription(
`❗ **REPORT STAFF**
・ reclami un membru staff care face abuz sau încalcă regulamentul

😈 **REPORT MEMBER**
・ reclami un membru obișnuit care încalcă regulamentul nostru

🩸 **BAN REPORTS**
・ reclami un membru care arată content porno/gore sau face expose

👑 **CONTACT OWNER**
・ probleme sau întrebări legate de grade (roluri) și promovări  
・ semnalezi un bug, probleme cu un manager, urgențe  
・ alte probleme pe care staff-ul obișnuit nu le poate rezolva

❓ **INFO & OTHERS**
・ alte întrebări legate de server, probleme care nu apar mai sus

📢 **Crearea ticketelor în batjocură/glumă se pedepsește!**
📢 **Nu ai voie să partajezi conținutul ticketelelor pe voice!**`
            )
            .setFooter({ text: "Awoken Tickets • Sistem automatizat" })
            .setTimestamp();

        const menu = new StringSelectMenuBuilder()
            .setCustomId("ticket_menu")
            .setPlaceholder("📄 Contact Owner")
            .addOptions([
                {
                    label: "📨 Contact Owner",
                    value: "contact_owner",
                    description: "Tichet pentru owner — probleme serioase"
                },
                {
                    label: "❓ Help & Info",
                    value: "help_info",
                    description: "Întrebări și informații generale"
                },
                {
                    label: "🛡 Report Staff",
                    value: "report_staff",
                    description: "Raportezi un membru staff"
                },
                {
                    label: "⚠️ Report Member",
                    value: "report_member",
                    description: "Raportezi un membru obișnuit"
                }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
