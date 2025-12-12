const { EmbedBuilder } = require("discord.js");
const DB = require("../utils/db");

module.exports = {
    name: "checkraportstaff",
    description: "Afișează rapoartele membrilor staff",
    async execute(message) {

        const ALLOWED_ROLES = [
            "1447946562184548414",
            "1447946410434498632",
            "1447946434660794491"
        ];

        if (!message.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id))) {
            return message.reply("❌ Nu ai acces.");
        }

        DB.getAllStaffReports(async (rows) => {

            if (!rows || rows.length === 0) {
                return message.channel.send("📭 Nu există date.");
            }

            for (const row of rows) {
                row.realMessages = await new Promise(r =>
                    DB.getMessageCount(row.staffId, r)
                );

                const h = Math.floor((row.voiceMinutes || 0) / 60);
                const m = (row.voiceMinutes || 0) % 60;
                row.voiceFormatted = `${h}h ${m}m`;
            }

            rows.sort((a, b) => b.realMessages - a.realMessages);

            let table = "**👥 RAPORT STAFF – ACTIVITATE**\n```ansi\n";
            table += "USER               | WRN | MUT | BAN | TICK | MSG | VOICE\n";
            table += "------------------------------------------------------------\n";

            for (const r of rows) {
                const member = message.guild.members.cache.get(r.staffId);
                const name = member ? member.user.username : r.staffId;

                table += `${name.padEnd(18)} | `
                    + `${String(r.warnsGiven).padEnd(3)} | `
                    + `${String(r.mutesGiven).padEnd(3)} | `
                    + `${String(r.bansGiven).padEnd(3)} | `
                    + `${String(r.ticketsClaimed || 0).padEnd(4)} | `
                    + `${String(r.realMessages).padEnd(3)} | `
                    + `${r.voiceFormatted}\n`;
            }

            table += "```";

            const embed = new EmbedBuilder()
                .setColor("Blurple")
                .setTitle("📊 Raport Staff – Activitate")
                .setDescription(table)
                .setFooter({ text: "Awoken Staff System" })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        });
    }
};
