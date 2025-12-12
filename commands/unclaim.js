const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const DB = require("../utils/db");
const perms = require("../utils/permissions");
const ticketPerms = require("../utils/ticketPermissions");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unclaim")
        .setDescription("Anulează revendicarea ticketului"),

    async execute(interaction) {
        const channel = interaction.channel;
        const member = interaction.member;

        const ticket = await DB.getTicket(channel.id);
        if (!ticket) {
            return interaction.reply({
                content: "❌ Acesta nu este un ticket.",
                ephemeral: true
            });
        }

        if (ticket.claimedBy !== member.id && !perms.isTier2(member)) {
            return interaction.reply({
                content: "❌ Nu poți da unclaim.",
                ephemeral: true
            });
        }

        ticket.claimedBy = null;
        await ticket.save?.();

        ticketPerms.applyInitialPermissions(
            channel,
            ticket.userId,
            perms.roles.tier1,
            perms.roles.tier2
        );

        const embed = new EmbedBuilder()
            .setColor("Orange")
            .setTitle("ℹ️ Ticket unclaim")
            .setDescription(`Ticketul a fost eliberat de **${member.user.tag}**`)
            .setFooter({ text: `Staff ID: ${member.id}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
