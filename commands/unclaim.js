const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const DB = require("../utils/db");
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

        if (!ticket.claimedBy) {
            return interaction.reply({
                content: "⚠️ Ticketul nu este revendicat.",
                ephemeral: true
            });
        }

        // 🔒 DOAR CLAIMERUL
        if (ticket.claimedBy !== member.id) {
            return interaction.reply({
                content: "❌ Doar staff-ul care a dat claim poate da unclaim.",
                ephemeral: true
            });
        }

        // ✅ RESET CLAIM
        ticket.claimedBy = null;
        await ticket.save();

        // ✅ RESET PERMISIUNI
        ticketPerms.applyInitialPermissions(
            channel,
            ticket.userId
        );

        const embed = new EmbedBuilder()
            .setColor("Orange")
            .setTitle("ℹ️ Ticket unclaim")
            .setDescription(`Ticketul a fost eliberat de **${member.user.tag}**`)
            .setFooter({ text: `Staff ID: ${member.id}` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
