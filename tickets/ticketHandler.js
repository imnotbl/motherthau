// tickets/ticketHandler.js
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

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("claim_ticket")
                    .setLabel("Claim")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId("close_ticket")
                    .setLabel("Close")
                    .setStyle(ButtonStyle.Danger)
            );

            const msg = await channel.send({
                content: `<@&${STAFF_ROLE}> <@${user.id}>`,
                embeds: [embed],
                components: [row]
            });

            await DB.setTicketMessage(channel.id, msg.id);

            return interaction.reply({ content: "🎟 Tichet deschis!", ephemeral: true });
        }

        // =====================================================
        // BUTTON HANDLING
        // =====================================================
        if (!interaction.isButton()) return;
        if (!interaction.channel) return;

        const channel = interaction.channel;
        const member = interaction.member;

        const ticket = await DB.getTicket(channel.id);
        if (!ticket) return;

        const fetchMainMessage = async () =>
            channel.messages.fetch(ticket.messageId).catch(() => null);

        // =====================================================
        // CLAIM
        // =====================================================
        if (interaction.customId === "claim_ticket") {
            if (!perms.isTier1(member) && !perms.isTier2(member)) {
                return interaction.reply({ content: "Nu ai permisiune.", ephemeral: true });
            }

            if (!ticket.claimedBy) {
                ticket.claimedBy = member.id;

                if (!ticket.credited) {
                    await DB.incrementStaffTickets(member.id);
                    ticket.credited = true;
                }

                await ticket.save?.();
            }

            ticketPerms.applyClaim(
                channel,
                member.id,
                ticket.userId,
                perms.roles.tier1,
                perms.roles.tier2
            );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("unclaim_ticket")
                    .setLabel("Unclaim")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("close_ticket")
                    .setLabel("Close")
                    .setStyle(ButtonStyle.Danger)
            );

            const msg = await fetchMainMessage();
            if (msg) await msg.edit({ components: [row] });

            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setDescription(`📌 Ticket revendicat de <@${member.id}>`)
                ]
            });

            return;
        }

        // =====================================================
        // UNCLAIM
        // =====================================================
        if (interaction.customId === "unclaim_ticket") {
            if (ticket.claimedBy !== member.id && !perms.isTier2(member)) {
                return interaction.reply({ content: "Nu poți unclaim.", ephemeral: true });
            }

            ticket.claimedBy = null;
            await ticket.save?.();

            ticketPerms.applyInitialPermissions(
                channel,
                ticket.userId,
                perms.roles.tier1,
                perms.roles.tier2
            );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("claim_ticket")
                    .setLabel("Claim")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId("close_ticket")
                    .setLabel("Close")
                    .setStyle(ButtonStyle.Danger)
            );

            const msg = await fetchMainMessage();
            if (msg) await msg.edit({ components: [row] });

            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setDescription(`ℹ️ <@${member.id}> a dat unclaim.`)
                ]
            });

            return;
        }

        // =====================================================
        // CLOSE (CONFIRM)
        // =====================================================
        if (interaction.customId === "close_ticket") {
            if (ticket.claimedBy !== member.id && !perms.isTier2(member)) {
                return interaction.reply({ content: "Nu poți închide.", ephemeral: true });
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
                        .setDescription("Confirmi închiderea ticketului?")
                ],
                components: [row],
                ephemeral: true
            });
        }

        if (interaction.customId === "cancel_close") {
            return interaction.update({ content: "❌ Închidere anulată.", components: [] });
        }

        // =====================================================
        // FINAL CLOSE + TRANSCRIPT
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
                                { name: "Staff", value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "Nerevendicat", inline: true },
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
