const fs = require("fs");
const embeds = require("../utils/embedBuilder");
const DB = require("../utils/db");

module.exports = {
    name: "resetraportstaff",
    description: "Resetează TOATE rapoartele staff și le salvează într-un fișier.",
    async execute(message, args, client) {

        const ALLOWED_ROLES = [
            "1447946562184548414",
            "1447946410434498632",
            "1447946434660794491"
        ];

        // verificăm accesul
        if (!message.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id))) {
            return message.reply({
                embeds: [embeds.error("Acces refuzat", "Nu ai permisiune să folosești această comandă.")]
            });
        }

        DB.getAllStaffReports(async (rows) => {

            if (!rows || rows.length === 0) {
                return message.reply({
                    embeds: [embeds.error("Eroare", "Nu există date de resetat.")]
                });
            }

            // generăm conținutul fișierului
            let logText = "=== RAPORT STAFF — BACKUP ÎNAINTE DE RESET ===\n\n";

            for (const row of rows) {

                // 🔥 conversie minute → ore + minute
                const total = row.voiceMinutes || 0;
                const hours = Math.floor(total / 60);
                const minutes = total % 60;
                const voiceFormatted = `${hours}h ${minutes}m`;

                logText += `Staff: ${row.staffId}\n`;
                logText += ` • Warn-uri date: ${row.warnsGiven}\n`;
                logText += ` • Mute-uri date: ${row.mutesGiven}\n`;
                logText += ` • Ban-uri date: ${row.bansGiven}\n`;
                logText += ` • Tickete create: ${row.ticketsCreated}\n`;
                logText += ` • Mesaje trimise: ${row.messagesSent}\n`;
                logText += ` • Timp Voice: ${voiceFormatted} (${row.voiceMinutes} minute)\n`;
                logText += `----------------------------------------\n`;
            }

            // creăm folder dacă nu există
            if (!fs.existsSync("./staff_backups")) {
                fs.mkdirSync("./staff_backups");
            }

            const filePath = `./staff_backups/staff_backup_${Date.now()}.txt`;
            fs.writeFileSync(filePath, logText);

            // trimitem backup-ul pe canal
            const logChannelId = "1448350217593163838";
            const logChannel = message.guild.channels.cache.get(logChannelId);

            if (logChannel) {
                await logChannel.send({
                    content: "📄 **Backup înainte de resetarea rapoartelor staff:**",
                    files: [filePath]
                });
            }

            // 🔥 RESETĂM staff_reports
            DB.resetStaffReports();

            return message.reply({
                embeds: [
                    embeds.success(
                        "Reset complet",
                        "Toate rapoartele staff au fost resetate și backup-ul a fost trimis."
                    )
                ]
            });
        });
    }
};
