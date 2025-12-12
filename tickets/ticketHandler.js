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

const STAFF_ROLE = "1447684240966815977";
const LOG_CHANNEL = "1447896638965415956";

/* =====================================================
   🔁 Ticket Buttons
===================================================== */
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
           ⭐ RATING BUTTONS (DM)
        ===================================================== */
        if (interaction.isButton() && interaction.customId.startsWith("rate_")) {
            const [, staffId, value] = interaction.customId.split("_");
            const rating = Number(value);

            if (await DB.hasUserRated(staffId, interaction.user.id)) {
                return interaction.reply({
                    content: "⚠️ Ai oferit deja un rating.",
                    ephemeral: true
                });
            }

            await DB.addStaffRating(staffId, interaction.user.id, rating);

            const disabledRow = new ActionRowBuilder().addComponents(
                [1, 2, 3, 4, 5].map(n =>
                    new ButtonBuilder()
                        .setCustomId(`disabled_${n}`)
                        .setLabel("⭐".repeat(n))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                )
            );

            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Mulțumim pentru feedback!")
                        .setDescription(`Ai acordat **${rating}⭐** staff-ului <@${staffId}>.`)
                ],
                components: [disabledRow]
            });

            const avg = await DB.getStaffAverageRating(staffId);
            const log = interaction.client.channels.cache.get(LOG_CHANNEL);

            log?.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Gold")
                        .setTitle("⭐ Rating nou")
                        .addFields(
                            { name: "User", value: `<@${interaction.user.id}>`, inline: true },
                            { name: "Staff", value: `<@${staffId}>`, inline: true },
                            { name: "Rating", value: "⭐".repeat(rating), inline: true },
                            { name: "Media", value: `${avg} ⭐`, inline: true }
                        )
                        .setTimestamp()
                ]
            });
            return;
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

        /* ================= CLOSE CONFIRM ================= */
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

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("confirm_close")
                    .setLabel("Confirm")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId("cancel_close")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Secondary)
            );

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("❗ Ești sigur că vrei să închizi ticketul?")
                ],
                components: [row],
                ephemeral: true
            });
        }

        if (interaction.customId === "cancel_close") {
            return interaction.update({ components: [] });
        }

        /* ================= FINAL CLOSE ================= */
        if (interaction.customId === "confirm_close") {

            const html = await transcriptSys.generateTranscript(channel);
            const url = await githubUploader.uploadTranscript(html, `${channel.id}.html`);

            /* LOG CHANNEL */
            const log = interaction.guild.channels.cache.get(LOG_CHANNEL);
            log?.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Blurple")
                        .setTitle("📄 Ticket închis")
                        .addFields(
                            { name: "User", value: `<@${ticket.userId}>`, inline: true },
                            { name: "Staff", value: `<@${ticket.claimedBy}>`, inline: true },
                            { name: "Transcript", value: `[Vezi aici](${url})` }
                        )
                        .setTimestamp()
                ]
            });

            /* DM USER */
            try {
                const user = await interaction.guild.members.fetch(ticket.userId);

                await user.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Purple")
                            .setTitle("📄 Transcript ticket")
                            .setDescription(`[Vezi transcript](${url})`)
                    ]
                });

                const ratingRow = new ActionRowBuilder().addComponents(
                    [1, 2, 3, 4, 5].map(n =>
                        new ButtonBuilder()
                            .setCustomId(`rate_${ticket.claimedBy}_${n}`)
                            .setLabel("⭐".repeat(n))
                            .setStyle(ButtonStyle.Secondary)
                    )
                );

                await user.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Gold")
                            .setTitle("⭐ Evaluează staff-ul")
                            .setDescription(`Staff: <@${ticket.claimedBy}>`)
                    ],
                    components: [ratingRow]
                });
            } catch {}

            await DB.deleteTicket(channel.id);
            return channel.delete();
        }
    });
};
