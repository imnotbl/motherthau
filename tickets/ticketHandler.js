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
const transcriptSys = require("./transcriptSystem");
const githubUploader = require("../utils/githubUploader");

const LOG_CHANNEL = "1447896638965415956";
const STAFF_ROLE = "1447684240966815977";

/**
 * 🔁 Returnează butoanele corecte
 */
function getTicketButtons(ticket) {
    const row = new ActionRowBuilder();

    if (ticket.claimedBy) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId("unclaim_ticket")
                .setLabel("Unclaim")
                .setStyle(ButtonStyle.Secondary)
        );
    } else {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId("claim_ticket")
                .setLabel("Claim")
                .setStyle(ButtonStyle.Success)
        );
    }

    row.addComponents(
        new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Close")
            .setStyle(ButtonStyle.Danger)
    );

    return row;
}

module.exports = (client) => {

    client.on("interactionCreate", async (interaction) => {

        // =====================================================
        // 🎫 CREATE TICKET
        // =====================================================
        if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
            const option = interaction.values[0];
            const { user, guild } = interaction;

            const ticketId = Date.now().toString().slice(-6);
            const names = {
                contact_owner: `c-owner-${ticketId}`,
                help_info: `h-info-${ticketId}`,
                report_staff: `rs-${ticketId}`,
                report_member: `rm-${ticketId}`
            };

            const channel = await guild.channels.create({
                name: names[option] ?? `ticket-${ticketId}`,
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

            const embed = new EmbedBuilder()
                .setColor("Purple")
                .setTitle("🎫 Tichet creat")
                .setDescription(`Salut <@${user.id}>, ticketul tău a fost creat.`);

            await channel.send({
                content: `<@&${STAFF_ROLE}> <@${user.id}>`,
                embeds: [embed],
                components: [getTicketButtons({ claimedBy: null })]
            });

            return interaction.reply({ content: "🎟 Tichet deschis!", ephemeral: true });
        }

        // =====================================================
        // 🔁 CHANGE PANEL DROPDOWN (FIXAT)
        // =====================================================
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
            if (!ticket) {
                return interaction.reply({ content: "❌ Acesta nu este un ticket.", ephemeral: true });
            }

            // 🔒 DOAR CLAIMER SAU TIER2
            if (ticket.claimedBy !== member.id && !perms.isTier2(member)) {
                return interaction.reply({
                    content: "❌ Doar claimerul sau Tier2 poate schimba panelul.",
                    ephemeral: true
                });
            }

            await interaction.deferUpdate(); // ✅ prevenim timeout

            const suffix = channel.name.split("-").slice(-1)[0];
            const newName = `${PANELS[newPanel]}-${suffix}`;

            await channel.setName(newName).catch(() => {});
            await channel.setTopic(`Ticket creat de <@${ticket.userId}> | Tip: ${newPanel}`).catch(() => {});

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Panel schimbat")
                        .setDescription(`Ticketul a fost mutat pe **${newPanel.replace("_", " ")}**.`)
                ],
                components: []
            });
        }

        // =====================================================
        // 🔘 BUTTON HANDLING
        // =====================================================
        if (!interaction.isButton()) return;
        if (!interaction.channel) return;

        const channel = interaction.channel;
        const member = interaction.member;

        const ticket = await DB.getTicket(channel.id);
        if (!ticket) return;

        // =====================================================
        // CLAIM
        // =====================================================
        if (interaction.customId === "claim_ticket") {
            if (!perms.isTier1(member) && !perms.isTier2(member)) {
                return interaction.reply({ content: "❌ Nu ai permisiune.", ephemeral: true });
            }

            if (ticket.claimedBy) {
                return interaction.reply({
                    content: `⚠️ Ticketul este deja revendicat de <@${ticket.claimedBy}>.`,
                    ephemeral: true
                });
            }

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
    });
};
