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

const LOG_CHANNEL = "1447896638965415956";  // canal log tichete
const STAFF_ROLE = "1447684240966815977";   // rol staff

module.exports = (client) => {

    client.on("interactionCreate", async (interaction) => {

        // =====================================================
        // 🎫 CREATE TICKET (SELECT MENU)
        // =====================================================
        if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {

            const option = interaction.values[0];
            const user = interaction.user;
            const guild = interaction.guild;

            const ticketId = Date.now().toString().slice(-6);

            const names = {
                contact_owner: `c-owner-${ticketId}`,
                help_info: `h-info-${ticketId}`,
                report_staff: `rs-${ticketId}`,
                report_member: `rm-${ticketId}`
            };

            const channel = await guild.channels.create({
                name: names[option],
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
                .setDescription(`Salut <@${user.id}>, ticketul tău a fost creat. Așteaptă un membru staff.`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
            );

            await channel.send({
                content: `<@&${STAFF_ROLE}> <@${user.id}>`,
                embeds: [embed],
                components: [row]
            });

            return interaction.reply({ content: "🎟 Tichet deschis!", ephemeral: true });
        }

        // =====================================================
        // BUTTON HANDLING
        // =====================================================
        if (!interaction.isButton()) return;

        const channel = interaction.channel;
        const member = interaction.member;

        DB.getTicket(channel.id, async (ticket) => {
            if (!ticket) return;

            // =====================================================
            // CLAIM
            // =====================================================
            if (interaction.customId === "claim_ticket") {

                if (!perms.isTier1(member) && !perms.isTier2(member)) {
                    return interaction.reply({ content: "Nu ai permisiune.", ephemeral: true });
                }

                ticket.claimedBy = member.id;
                await ticket.save?.(); // în caz că e document Mongoose

                ticketPerms.applyClaim(
                    channel,
                    member.id,
                    ticket.userId,
                    perms.roles.tier1,
                    perms.roles.tier2
                );

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("unclaim_ticket").setLabel("Unclaim").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
                );

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setDescription(`📌 Ticket revendicat de <@${member.id}>`)
                    ],
                    ephemeral: true
                });

                const msg = (await channel.messages.fetch({ limit: 1 })).first();
                if (msg) await msg.edit({ components: [row] });

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
                    new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
                );

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Orange")
                            .setDescription(`ℹ️ <@${member.id}> a dat unclaim.`)
                    ],
                    ephemeral: true
                });

                const msg = (await channel.messages.fetch({ limit: 1 })).first();
                if (msg) await msg.edit({ components: [row] });

                return;
            }

            // =====================================================
            // CLOSE (STEP 1)
            // =====================================================
            if (interaction.customId === "close_ticket") {

                if (ticket.claimedBy !== member.id && !perms.isTier2(member)) {
                    return interaction.reply({ content: "Nu poți închide.", ephemeral: true });
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("confirm_close").setLabel("Confirm").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("cancel_close").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
                );

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setDescription("Confirmi închiderea?")
                    ],
                    components: [row],
                    ephemeral: true
                });
            }

            // =====================================================
            // CANCEL CLOSE
            // =====================================================
            if (interaction.customId === "cancel_close") {
                return interaction.update({
                    content: "❌ Închidere anulată.",
                    components: []
                });
            }

            // =====================================================
            // CLOSE — FINAL + TRANSCRIPT PREMIUM (GitHub Pages)
            // =====================================================
            if (interaction.customId === "confirm_close") {
                try {
                    // 1) generăm transcript HTML
                    const html = await transcriptSys.generateTranscript(channel);
                    const fileName = `${channel.id}.html`;

                    // 2) upload pe GitHub (awoken-transcript / transcripts/...)
                    const url = await githubUploader.uploadTranscript(html, fileName);

                    // 3) log în canalul de staff
                    const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor("Blurple")
                            .setTitle("📄 Ticket închis")
                            .addFields(
                                { name: "User", value: `<@${ticket.userId}>`, inline: true },
                                {
                                    name: "Staff",
                                    value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "Nerevendicat",
                                    inline: true
                                },
                                { name: "Transcript", value: `[Deschide pagina](${url})` }
                            );

                        logChannel.send({ embeds: [logEmbed] });
                    }

                    // 4) DM la user cu link frumos
                    try {
                        const usr = await interaction.guild.members.fetch(ticket.userId);
                        await usr.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor("Purple")
                                    .setTitle("📄 Transcript tichet")
                                    .setDescription(`Poți vedea transcriptul tău aici:\n${url}`)
                            ]
                        });
                    } catch {
                        // ignorăm dacă are DM-urile închise
                    }

                } catch (err) {
                    console.error("Eroare generare / upload transcript:", err);
                    await interaction.reply({
                        content: "❌ A apărut o eroare la generarea transcriptului.",
                        ephemeral: true
                    });
                    return;
                }

                // 5) ștergem ticketul din DB + canalul
                await DB.deleteTicket(channel.id);
                await channel.delete().catch(() => { });

                return;
            }

        });
    });
};
