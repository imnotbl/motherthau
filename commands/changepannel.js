const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder
} = require("discord.js");

const embeds = require("../utils/embedBuilder");
const perms = require("../utils/permissions");
const DB = require("../utils/db");

module.exports = {
    name: "changepannel",
    description: "Schimbă tipul ticketului folosind dropdown.",
    async execute(message) {

        const channel = message.channel;

        // — VERIFICĂ TICKET —
        const ticket = await DB.getTicket(channel.id);
        if (!ticket) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Acesta nu este un ticket.")]
            });
        }

        // — PERMISIUNI —
        if (ticket.claimedBy !== message.author.id && !perms.isTier2(message.member)) {
            return message.reply({
                embeds: [
                    embeds.error(
                        "Acces refuzat",
                        "Doar claimer-ul sau Tier2 poate schimba panelul."
                    )
                ]
            });
        }

        // — EMBED —
        const embed = new EmbedBuilder()
            .setColor("Blurple")
            .setTitle("🔁 Schimbă panelul ticketului")
            .setDescription("Selectează noul tip de ticket din listă:");

        // — DROPDOWN —
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("change_panel_select")
                .setPlaceholder("Selectează un panel")
                .addOptions([
                    {
                        label: "Contact Owner",
                        value: "contact_owner",
                        emoji: "👑"
                    },
                    {
                        label: "Help / Info",
                        value: "help_info",
                        emoji: "ℹ️"
                    },
                    {
                        label: "Report Staff",
                        value: "report_staff",
                        emoji: "🛡️"
                    },
                    {
                        label: "Report Member",
                        value: "report_member",
                        emoji: "👤"
                    }
                ])
        );

        return message.reply({
            embeds: [embed],
            components: [row]
        });
    }
};
