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
const transcriptSys = require("./transcriptSystem"); // <-- PREMIUM transcript
const catbox = require("../utils/catbox");
const fs = require("fs");

const LOG_CHANNEL = "1447896638965415956";
const STAFF_ROLE = "1447684240966815977";

module.exports = (client) => {

    client.on("interactionCreate", async (interaction) => {

        // =====================================================
        // 🎫 CREATE TICKET
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

                if (!ticket.credited) {
                    await DB.incrementStaffTickets(member.id);
                    ticket.credited = true;
                }

                await ticket.save();

                ticketPerms.applyClaim(channel, member.id, ticket.userId, perms.roles.tier1, perms.roles.tier2);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("unclaim_ticket").setLabel("Unclaim").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
                );

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setDescription(`📌 Ticket revendicat de <@${member.id}>`)
                    ]
                });

                const msg = (await channel.messages.fetch({ limit: 1 })).first();
                return msg?.edit({ components: [row] });
            }

            // =====================================================
            // UNCLAIM
            // =====================================================
            if (interaction.customId === "unclaim_ticket") {

                if (ticket.claimedBy !== member.id && !perms.isTier2(member)) {
                    return interaction.reply({ content: "Nu poți unclaim.", ephemeral: true });
                }

                ticket.claimedBy = null;
                await ticket.save();

                ticketPerms.applyInitialPermissions(channel, ticket.userId, perms.roles.tier1, perms.roles.tier2);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
                );

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Orange")
                            .setDescription(`ℹ️ <@${member.id}> a dat unclaim.`)
                    ]
                });

                const msg = (await channel.messages.fetch({ limit: 1 })).first();
                return msg?.edit({ components: [row] });
            }

            // =====================================================
            // CLOSE STEP 1
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
            // CLOSE FINAL — cu TRANSCRIPT PREMIUM
            // =====================================================
            if (interaction.customId === "confirm_close") {

                // -------------------------------
                // 1️⃣ Generare transcript HTML
                // -------------------------------
                const html = await transcriptSys.generateTranscript(channel);

                if (!fs.existsSync("./transcripts"))
                    fs.mkdirSync("./transcripts");

                const filePath = `./transcripts/${channel.id}.html`;
                fs.writeFileSync(filePath, html);


                // -------------------------------
                // 2️⃣ Upload la Catbox (obții link)
                // -------------------------------
                const url = await catbox.uploadFile(filePath);


                // -------------------------------
                // 3️⃣ Log pe canalul de staff
                // -------------------------------
                const log = interaction.guild.channels.cache.get(LOG_CHANNEL);

                if (log) {
                    log.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Blurple")
                                .setTitle("📄 Ticket închis")
                                .addFields(
                                    { name: "User", value: `<@${ticket.userId}>`, inline: true },
                                    { name: "Staff", value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "Nerevendicat", inline: true },
                                    { name: "Transcript", value: `[Deschide transcript](${url})` }
                                )
                        ]
                    });
                }


                // -------------------------------
                // 4️⃣ DM către user
                // -------------------------------
                try {
                    const usr = await interaction.guild.members.fetch(ticket.userId);
                    usr.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Purple")
                                .setTitle("📄 Transcriptul tău este gata")
                                .setDescription(`Poți vizualiza transcriptul premium aici:\n${url}`)
                        ]
                    });
                } catch {}


                // -------------------------------
                // 5️⃣ Ștergere ticket din DB
                // -------------------------------
                await DB.deleteTicket(channel.id);


                // -------------------------------
                // 6️⃣ Delete channel
                // -------------------------------
                await channel.delete();

                return;
            }

        });
    });
};
