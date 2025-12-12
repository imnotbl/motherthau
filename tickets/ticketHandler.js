const {
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

const DB = require("../utils/db");
const perms = require("../utils/permissions");
const ticketPerms = require("../utils/ticketPermissions");

const STAFF_ROLE = "1447684240966815977";

/**
 * 🔁 Butoane ticket
 */
function getTicketButtons(ticket) {
    return new ActionRowBuilder().addComponents(
        ticket.claimedBy
            ? new ButtonBuilder()
                  .setCustomId("unclaim_ticket")
                  .setLabel("Unclaim")
                  .setStyle(ButtonStyle.Secondary)
            : new ButtonBuilder()
                  .setCustomId("claim_ticket")
                  .setLabel("Claim")
                  .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Close")
            .setStyle(ButtonStyle.Danger)
    );
}

module.exports = (client) => {
    client.on("interactionCreate", async (interaction) => {

        /* =====================================================
           🎫 CREATE TICKET
        ===================================================== */
        if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
            const option = interaction.values[0];
            const { user, guild } = interaction;

            const id = Date.now().toString().slice(-6);
            const names = {
                contact_owner: `c-owner-${id}`,
                help_info: `h-info-${id}`,
                report_staff: `rs-${id}`,
                report_member: `rm-${id}`
            };

            const channel = await guild.channels.create({
                name: names[option] ?? `ticket-${id}`,
                type: ChannelType.GuildText,
                topic: `Ticket creat de ${user.tag} | Tip: ${option}`
            });

            ticketPerms.applyInitialPermissions(
                channel,
                user.id,
                perms.roles.tier1,
                perms.roles.tier2
            );

            await DB.addTicket(channel.id, user.id);

            await channel.send({
                content: `<@&${STAFF_ROLE}> <@${user.id}>`,
                embeds: [
                    new EmbedBuilder()
                        .setColor("Purple")
                        .setTitle("🎫 Tichet creat")
                        .setDescription(`Salut <@${user.id}>, ticketul tău a fost creat.`)
                ],
                components: [getTicketButtons({ claimedBy: null })]
            });

            return interaction.reply({ content: "🎟 Tichet deschis!", ephemeral: true });
        }

        /* =====================================================
           🔁 CHANGE PANEL (DROPDOWN)
        ===================================================== */
        if (interaction.isStringSelectMenu() && interaction.customId === "change_panel_select") {
            const channel = interaction.channel;
            const member = interaction.member;
            const newPanel = interaction.values[0];

            const PANELS = {
                contact_owner: "c-owner",
                help_info: "h-info",
                report_staff: "rs",
                report_member: "rm"
            };

            const ticket = await DB.getTicket(channel.id);
            if (!ticket)
                return interaction.reply({ content: "❌ Nu este ticket.", ephemeral: true });

            if (ticket.claimedBy !== member.id && !perms.isTier2(member))
                return interaction.reply({
                    content: "❌ Doar claimerul sau Tier2 poate schimba panelul.",
                    ephemeral: true
                });

            await interaction.deferUpdate();

            const suffix = channel.name.split("-").pop();
            await channel.setName(`${PANELS[newPanel]}-${suffix}`);
            await channel.setTopic(`Ticket creat de <@${ticket.userId}> | Tip: ${newPanel}`);

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Panel schimbat")
                        .setDescription(`Panel schimbat în **${newPanel.replace("_", " ")}**`)
                ],
                components: []
            });
        }

        /* =====================================================
           🔘 BUTTONS
        ===================================================== */
        if (!interaction.isButton()) return;

        const channel = interaction.channel;
        const member = interaction.member;
        const ticket = await DB.getTicket(channel.id);
        if (!ticket) return;

        /* ================= CLAIM ================= */
        if (interaction.customId === "claim_ticket") {
            if (!perms.isTier1(member) && !perms.isTier2(member))
                return interaction.reply({ content: "❌ Nu ai permisiune.", ephemeral: true });

            if (ticket.claimedBy)
                return interaction.reply({
                    content: `⚠️ Ticket deja revendicat de <@${ticket.claimedBy}>.`,
                    ephemeral: true
                });

            ticket.claimedBy = member.id;
            await ticket.save();
            await DB.incrementStaffTickets(member.id);

            ticketPerms.applyClaim(
                channel,
                member.id,
                ticket.userId,
                perms.roles.tier1,
                perms.roles.tier2
            );

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setDescription(`📌 Ticket revendicat de <@${member.id}>`)
                ]
            });
        }

        /* ================= UNCLAIM ================= */
        if (interaction.customId === "unclaim_ticket") {
            if (ticket.claimedBy !== member.id)
                return interaction.reply({
                    content: "❌ Doar claimerul poate da unclaim.",
                    ephemeral: true
                });

            ticket.claimedBy = null;
            await ticket.save();

            ticketPerms.applyInitialPermissions(
                channel,
                ticket.userId,
                perms.roles.tier1,
                perms.roles.tier2
            );

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setDescription(`ℹ️ Ticket eliberat de <@${member.id}>`)
                ]
            });
        }

        /* ================= CLOSE ================= */
        if (interaction.customId === "close_ticket") {
            if (!ticket.claimedBy)
                return interaction.reply({
                    content: "❌ Ticketul trebuie revendicat.",
                    ephemeral: true
                });

            if (ticket.claimedBy !== member.id && !perms.isTier2(member))
                return interaction.reply({
                    content: "❌ Doar claimerul sau Tier2 poate închide.",
                    ephemeral: true
                });

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("🗑️ Ticketul va fi închis.")
                ]
            });

            await DB.deleteTicket(channel.id);
            return channel.delete();
        }
    });
};
