const { EmbedBuilder } = require("discord.js");
const DB = require('../utils/db');
const embeds = require('../utils/embedBuilder');

module.exports = {
    name: "raport",
    description: "Arată raportul complet al unui membru staff.",

    async execute(message, args) {

        const STAFF_ROLE = "1447684240966815977";

        if (!message.member.roles.cache.has(STAFF_ROLE)) {
            return message.reply({
                embeds: [embeds.error("Acces refuzat", "Nu figurezi în baza de date ca staff.")]
            });
        }

        const target = message.mentions.members.first() || message.member;
        const avatarURL = target.user.displayAvatarURL({ size: 512, extension: "png" });

        await DB.ensureStaffRecord(target.id);

        const [
            sWarnCount,
            report,
            msgCount,
            ticketStats
        ] = await Promise.all([
            new Promise(resolve => DB.getSpecialWarnCount(target.id, resolve)),
            new Promise(resolve => DB.getStaffReport(target.id, resolve)),
            new Promise(resolve => DB.getMessageCount(target.id, resolve)),
            new Promise(resolve => DB.getStaffTicketStats(target.id, resolve))
        ]);

        const data = report || {
            warnsGiven: 0,
            mutesGiven: 0,
            bansGiven: 0,
            ticketsCreated: 0,
            voiceMinutes: 0
        };

        const claimedTickets = ticketStats?.claimed || 0;

        const h = Math.floor(data.voiceMinutes / 60);
        const m = data.voiceMinutes % 60;
        const voice = `${h}h ${m}m`;

        const embed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setAuthor({
                name: `📋 Raport — ${target.user.username}`,
                iconURL: avatarURL
            })
            .setThumbnail(avatarURL)
            .setDescription(
`**Mutes**  **Bans**  **Voice Time**
${data.mutesGiven}   ${data.bansGiven}   ${voice}

**Messages**
${msgCount}

**Tickets**
${claimedTickets}

**Special Warns**
${sWarnCount}`
            )
            .setFooter({ text: `ID: ${target.id}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
