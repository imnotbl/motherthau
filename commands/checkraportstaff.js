const { EmbedBuilder } = require("discord.js");
const db = require("../utils/db");

module.exports = {
    name: "checkraportstaff",
    description: "Afișează rapoartele membrilor staff (FULL ACCESS STAFF SERVER ONLY)",
    async execute(message, args, client) {

        const ALLOWED_ROLES = [
            "1447946562184548414",
            "1447946410434498632",
            "1447946434660794491"
        ];

        if (!message.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id))) {
            return message.reply("❌ Nu ai acces la această comandă.");
        }

        db.getAllStaffReports(async (rows) => {

            if (!rows || rows.length === 0) {
                return message.channel.send("📭 Nu există date în rapoartele staff.");
            }

            // ---------------------------------------------------------
            // Luăm mesajele reale din canalul staff pentru fiecare user
            // ---------------------------------------------------------
            for (let row of rows) {
                await new Promise(resolve => {
                    db.getMessageCount(row.staffId, (msgCount) => {
                        row.realMessages = msgCount;
                        resolve();
                    });
                });

                // 🔥 Convertim voice minutes în ore + minute
                const totalMinutes = row.voiceMinutes || 0;
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;

                row.voiceFormatted = `${hours}h ${minutes}m`;
            }

            // sortăm după mesaje reale
            rows.sort((a, b) => b.realMessages - a.realMessages);

            // ---------------------------------------------------------
            // Construim tabelul
            // ---------------------------------------------------------
            let table = "**👥 RAPORT STAFF – TABEL ACTIVITATE**\n";
            table += "```ansi\n";
            table += "USER               | WRN | MUT | BAN | TICK | MSG | VOICE\n";
            table += "------------------------------------------------------------\n";

            for (const row of rows) {
                const user = message.guild.members.cache.get(row.staffId);

                const userName = user ? user.user.username : row.staffId;

                table += `${userName.padEnd(18)} | `
                      + `${String(row.warnsGiven).padEnd(3)} | `
                      + `${String(row.mutesGiven).padEnd(3)} | `
                      + `${String(row.bansGiven).padEnd(3)} | `
                      + `${String(row.ticketsCreated).padEnd(4)} | `
                      + `${String(row.realMessages).padEnd(3)} | `
                      + `${row.voiceFormatted.padEnd(7)}\n`;
            }

            table += "```";

            const embed = new EmbedBuilder()
                .setColor("Blurple")
                .setTitle("📊 Raport Staff – Activitate Completă")
                .setDescription(table)
                .setFooter({ text: "Awoken Staff System" })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        });
    }
};
