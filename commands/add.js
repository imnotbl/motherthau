const embeds = require('../utils/embedBuilder');
const perms = require('../utils/permissions');
const DB = require('../utils/db');

module.exports = {
    name: "add",
    async execute(message, args) {

        const channel = message.channel;

        // — TARGET —
        let target = message.mentions.members.first();

        if (!target) {
            const id = args[0];
            if (!id)
                return message.reply({
                    embeds: [embeds.error("Eroare", "Menționează un user sau folosește un ID.")]
                });

            try {
                target = await message.guild.members.fetch(id);
            } catch {
                return message.reply({
                    embeds: [embeds.error("Eroare", "ID invalid sau userul nu este pe server.")]
                });
            }
        }

        // — LUĂM TICKETUL DIN MONGODB —
        DB.getTicket(channel.id, async (ticket) => {

            if (!ticket) {
                return message.reply({
                    embeds: [embeds.error("Eroare", "Acesta nu este un canal de ticket.")]
                });
            }

            const claimer = ticket.claimedBy;

            if (claimer !== message.author.id) {
                return message.reply({
                    embeds: [embeds.error("Eroare", "Doar claimer-ul poate adăuga persoane în ticket.")]
                });
            }

            // — PERMISIUNI —
            await channel.permissionOverwrites.edit(target.id, {
                ViewChannel: true,
                SendMessages: true,
                AttachFiles: true,
            });

            return message.reply({
                embeds: [embeds.success("User adăugat", `${target} a fost adăugat în ticket.`)]
            });

        });
    }
};
