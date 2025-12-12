const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const DB = require("../utils/db");
const perms = require("../utils/permissions");
const ticketPerms = require("../utils/ticketPermissions");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("claim")
        .setDescription("Revendică ticketul curent"),

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

        if (!perms.isTier1(member) && !perms.isTier2(member)) {
            return interaction.reply({
                content: "❌ Nu ai permisiune.",
                ephemeral: true
            });
        }

        if (ticket.claimedBy) {
            return interaction.reply({
                content: "⚠️ Ticketul este deja revendicat.",
                ephemeral: true
            });
        }

        ticket.claimedBy = member.id;

        if (!ticket.credited) {
            await DB.incrementStaffTickets(member.id);
            ticket.credited = true;
        }

        await ticket.save?.();

        ticketPerms.applyClaim(
            channel,
            member.id,
            ticket.userId,
            perms.roles.tier1,
            perms.roles.tier2
        );

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("📌 Ticket revendicat")
            .setDescription(`Ticket revendicat de **${member.user.tag}**`)
            .setFooter({ text: `Staff ID: ${member.id}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
