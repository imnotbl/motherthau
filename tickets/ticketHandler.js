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
 * 🔁 Returnează mereu butoanele corecte
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

            const msg = await channel.send({
                content: `<@&${STAFF_ROLE}> <@${user.id}>`,
                embeds: [embed],
                components: [getTicketButtons({ claimedBy: null })]
            });

            await DB.setTicketMessage(channel.id, msg.id);

            return interaction.reply({ content: "🎟 Tichet deschis!", ephemeral: true });
        }

        // =====================================================
        // ⭐ RATING BUTTONS (DM)
        // =====================================================
        if (interaction.isButton() && interaction.customId.startsWith("rate_")) {
            const [, staffId, ratingValue] = interaction.customId.split("_");
            const rating = Number(ratingValue);

            if (!rating || rating < 1 || rating > 5) {
                return interaction.reply({ content: "❌ Rating invalid.", ephemeral: true });
            }

            const alreadyRated = await DB.hasUserRated(staffId, interaction.user.id);
            if (alreadyRated) {
                return interaction.reply({
                    content: "⚠️ Ai oferit deja un rating.",
                    ephemeral: true
                });
            }

            await DB.addStaffRating(staffId, interaction.user.id, rating);

        const disabledRow = new ActionRowBuilder().addComponents(
            [1, 2, 3, 4, 5].map(n =>
            new ButtonBuilder()
            .setCustomId(`disabled_${n}`) // ✅ UNIC
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
                        .setDescription(
                            `Ai acordat **${rating}⭐** staff-ului <@${staffId}>.\n\n` +
                            `Feedback-ul tău a fost salvat.`
                        )
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
                            { name: "Media staff", value: `${avg} ⭐`, inline: true }
                        )
                ]
            });

            return;
        }

        // =====================================================
        // BUTTON HANDLING (TICKET)
        // =====================================================
        if (!interaction.isButton()) return;
        if (!interaction.channel) return;

        const channel = interaction.channel;
        const member = interaction.member;

        const ticket = await DB.getTicket(channel.id);
        if (!ticket) return;

        const mainMessage = await channel.messages
            .fetch(ticket.messageId)
            .catch(() => null);

            // =====================================================
// 🔁 CHANGE PANEL DROPDOWN
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
        return interaction.reply({
            content: "❌ Acesta nu este un ticket.",
            ephemeral: true
        });
    }

    if (ticket.claimedBy !== member.id && !perms.isTier2(member)) {
        return interaction.reply({
            content: "❌ Nu ai permisiune să schimbi panelul.",
            ephemeral: true
        });
    }

    const suffix = channel.name.split("-").slice(-1)[0];
    const newName = `${PANELS[newPanel]}-${suffix}`;

    await channel.setName(newName);
    await channel.setTopic(
        `Ticket creat de <@${ticket.userId}> | Tip: ${newPanel}`
    );

    return interaction.update({
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
        // CLAIM
        // =====================================================
        if (interaction.customId === "claim_ticket") {
            if (!perms.isTier1(member) && !perms.isTier2(member)) {
                return interaction.reply({ content: "❌ Nu ai permisiune.", ephemeral: true });
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

            if (mainMessage) {
                await mainMessage.edit({ components: [getTicketButtons(ticket)] });
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setDescription(`📌 Ticket revendicat de <@${member.id}>`)
                ]
            });
        }

        // =====================================================
        // UNCLAIM
        // =====================================================
        if (interaction.customId === "unclaim_ticket") {
            if (ticket.claimedBy !== member.id && !perms.isTier2(member)) {
                return interaction.reply({
                    content: "❌ Nu poți da unclaim acestui ticket.",
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

            if (mainMessage) {
                await mainMessage.edit({ components: [getTicketButtons(ticket)] });
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setDescription(`ℹ️ <@${member.id}> a dat unclaim.`)
                ]
            });
        }

        // =====================================================
        // CLOSE (CONFIRM)
        // =====================================================
        if (interaction.customId === "close_ticket") {

            if (!ticket.claimedBy) {
                return interaction.reply({
                    content: "❌ Ticketul trebuie să fie revendicat înainte de a fi închis.",
                    ephemeral: true
                });
            }

            if (ticket.claimedBy !== member.id && !perms.isTier2(member)) {
                return interaction.reply({
                    content: "❌ Doar claimerul sau Tier2 poate închide ticketul.",
                    ephemeral: true
                });
            }

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
                        .setDescription("Ești sigur că vrei să închizi ticketul?")
                ],
                components: [row],
                ephemeral: true
            });
        }

        if (interaction.customId === "cancel_close") {
            return interaction.update({
                content: "❌ Închidere anulată.",
                components: []
            });
        }

        // =====================================================
        // FINAL CLOSE + TRANSCRIPT + RATING
        // =====================================================
        if (interaction.customId === "confirm_close") {
            try {
                const html = await transcriptSys.generateTranscript(channel);
                const url = await githubUploader.uploadTranscript(html, `${channel.id}.html`);

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
                    ]
                });

                try {
                    const usr = await interaction.guild.members.fetch(ticket.userId);

                    await usr.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Purple")
                                .setTitle("📄 Transcript ticket")
                                .setDescription(url)
                        ]
                    });

                    const ratingEmbed = new EmbedBuilder()
                        .setColor("Gold")
                        .setTitle("⭐ Evaluează staff-ul")
                        .setDescription(
                            `Te rugăm să acorzi un rating staff-ului care te-a ajutat:\n\n` +
                            `👤 **Staff:** <@${ticket.claimedBy}>`
                        );

                    const ratingRow = new ActionRowBuilder().addComponents(
                        [1,2,3,4,5].map(n =>
                            new ButtonBuilder()
                                .setCustomId(`rate_${ticket.claimedBy}_${n}`)
                                .setLabel("⭐".repeat(n))
                                .setStyle(ButtonStyle.Secondary)
                        )
                    );

                    await usr.send({
                        embeds: [ratingEmbed],
                        components: [ratingRow]
                    });

                } catch {}

            } catch (err) {
                console.error(err);
                return interaction.reply({
                    content: "❌ Eroare la generarea transcriptului.",
                    ephemeral: true
                });
            }

            await DB.deleteTicket(channel.id);
            await channel.delete().catch(() => {});
        }
    });
};
