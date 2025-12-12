const embeds = require("../utils/embedBuilder");
const perms = require("../utils/permissions");
const DB = require("../utils/db");

module.exports = {
    name: "remove",
    async execute(message, args) {

        const channel = message.channel;
        let target = message.mentions.members.first();

        // — TARGET: mention sau ID —
        if (!target) {
            const id = args[0];
            if (!id) {
                return message.reply({
                    embeds: [embeds.error("Eroare", "Menționează un user sau folosește un ID.")]
                });
            }

            try {
                target = await message.guild.members.fetch(id);
            } catch {
                return message.reply({
                    embeds: [embeds.error("Eroare", "ID invalid sau userul nu este pe server.")]
                });
            }
        }

        // — LUĂM TICKETUL DIN MONGODB —
        const ticket = await DB.getTicket(channel.id);

        if (!ticket) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Acest canal nu este un ticket valid.")]
            });
        }

        // — PERMISIUNI: doar claimer sau Tier2 —
        if (ticket.claimedBy !== message.author.id && !perms.isTier2(message.member)) {
            return message.reply({
                embeds: [
                    embeds.error(
                        "Eroare",
                        "Nu poți scoate membri. Doar claimer-ul sau Tier2 poate."
                    )
                ]
            });
        }

        // — ȘTERGEM PERMISIUNILE —
        await channel.permissionOverwrites
            .delete(target.id)
            .catch(() => {});

        return message.reply({
            embeds: [
                embeds.success(
                    "User eliminat",
                    `${target} a fost eliminat din ticket.`
                )
            ]
        });
    }
};
