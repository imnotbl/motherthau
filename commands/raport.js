const { EmbedBuilder } = require("discord.js");
const DB = require("../utils/db");
const embeds = require("../utils/embedBuilder");

module.exports = {
    name: "raport",
    description: "Arată raportul complet al unui membru staff.",

    async execute(message, args) {

        const STAFF_ROLE = "1447684240966815977";

        if (!message.member.roles.cache.has(STAFF_ROLE)) {
            return message.reply({
                embeds: [embeds.error("Acces refuzat", "Nu figurezi ca staff.")]
            });
        }

        const target = message.mentions.members.first() || message.member;
        const avatarURL = target.user.displayAvatarURL({ size: 512 });

        await DB.ensureStaffRecord(target.id);

        const [
            report,
            msgCount,
            avgRating
        ] = await Promise.all([
            DB.getStaffReport(target.id),
            DB.getMessageCount(target.id, "1447682897694691503"),
            DB.getStaffAverageRating(target.id)
        ]);

        const data = report || {
            warnsGiven: 0,
            mutesGiven: 0,
            bansGiven: 0,
            ticketsClaimed: 0,
            voiceMinutes: 0
        };

        const h = Math.floor(data.voiceMinutes / 60);
        const m = data.voiceMinutes % 60;

        const ratingStars =
            avgRating > 0
                ? "⭐".repeat(Math.round(avgRating))
                : "N/A";

        const embed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setAuthor({
                name: `📋 Raport — ${target.user.username}`,
                iconURL: avatarURL
            })
            .setThumbnail(avatarURL)
            .setDescription(
`**Mutes**  **Bans**  **Voice**
${data.mutesGiven}   ${data.bansGiven}   ${h}h ${m}m

**Messages (staff)**
${msgCount}

**Tickets claimed**
${data.ticketsClaimed || 0}

**Rating staff**
${avgRating} ⭐ (${ratingStars})`
            )
            .setFooter({ text: `ID: ${target.id}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
