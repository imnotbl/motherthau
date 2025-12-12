const fs = require("fs");
const embeds = require("../utils/embedBuilder");
const DB = require("../utils/db");

module.exports = {
    name: "resetraportstaff",
    description: "Resetează TOATE rapoartele staff (cu backup).",
    async execute(message) {

        const ALLOWED_ROLES = [
            "1447946562184548414",
            "1447946410434498632",
            "1447946434660794491"
        ];

        if (!message.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id))) {
            return message.reply({
                embeds: [embeds.error("Acces refuzat", "Nu ai permisiune.")]
            });
        }

        DB.getAllStaffReports(async (rows) => {

            if (!rows || rows.length === 0) {
                return message.reply({
                    embeds: [embeds.error("Eroare", "Nu există date.")]
                });
            }

            let logText = "=== BACKUP RAPORT STAFF ===\n\n";

            for (const r of rows) {
                const h = Math.floor((r.voiceMinutes || 0) / 60);
                const m = (r.voiceMinutes || 0) % 60;

                logText += `Staff: ${r.staffId}\n`;
                logText += `Warns: ${r.warnsGiven}\n`;
                logText += `Mutes: ${r.mutesGiven}\n`;
                logText += `Bans: ${r.bansGiven}\n`;
                logText += `Tickets claimed: ${r.ticketsClaimed || 0}\n`;
                logText += `Voice: ${h}h ${m}m\n`;
                logText += `-----------------------------\n`;
            }

            if (!fs.existsSync("./staff_backups")) {
                fs.mkdirSync("./staff_backups");
            }

            const filePath = `./staff_backups/staff_backup_${Date.now()}.txt`;
            fs.writeFileSync(filePath, logText);

            const logChannel = message.guild.channels.cache.get("1448350217593163838");
            if (logChannel) {
                await logChannel.send({
                    content: "📄 Backup raport staff:",
                    files: [filePath]
                });
            }

            await DB.resetStaffReports();

            return message.reply({
                embeds: [
                    embeds.success(
                        "Reset complet",
                        "Rapoartele au fost resetate și salvate."
                    )
                ]
            });
        });
    }
};
