const { EmbedBuilder } = require("discord.js");
const DB = require("../utils/db");
const perms = require("../utils/permissions");

module.exports = {
    name: "deleteratingstaff",
    description: "Șterge toate rating-urile unui membru staff (Tier2 only).",

    async execute(message, args) {

        // 🔒 DOAR TIER2
        if (!perms.isTier2(message.member)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("Acces refuzat")
                        .setDescription("Această comandă este disponibilă doar pentru **Tier2**.")
                ]
            });
        }

        const target =
            message.mentions.members.first() ||
            message.guild.members.cache.get(args[0]);

        if (!target) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setDescription("❌ Specifică un membru staff.\nEx: `#deleteratingstaff @user`")
                ]
            });
        }

        const count = await DB.deleteStaffRatings(target.id);

        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("⭐ Rating-uri șterse")
                    .setDescription(
                        `Au fost șterse **${count}** rating-uri pentru:\n` +
                        `👤 <@${target.id}>`
                    )
                    .setFooter({ text: `Acțiune efectuată de ${message.author.tag}` })
                    .setTimestamp()
            ]
        });
    }
};
