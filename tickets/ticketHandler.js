const {
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
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

/* =====================================================
   🧠 Helpers
===================================================== */
async function safeFetchMainMessage(channel, ticket) {
  // 1) dacă ai messageId în DB (recomandat)
  if (ticket?.messageId) {
    const msg = await channel.messages.fetch(ticket.messageId).catch(() => null);
    if (msg) return msg;
  }

  // 2) fallback: caută ultimul mesaj al botului care are butoane claim/close
  const msgs = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  if (!msgs) return null;

  const botMsg = msgs.find(
    (m) =>
      m.author?.bot &&
      m.components?.length &&
      m.components[0]?.components?.some((c) =>
        ["claim_ticket", "unclaim_ticket", "close_ticket"].includes(c.customId)
      )
  );

  return botMsg || null;
}

async function safeEditMainButtons(channel, ticket) {
  const mainMsg = await safeFetchMainMessage(channel, ticket);
  if (!mainMsg) return;

  await mainMsg.edit({ components: [getTicketButtons(ticket)] }).catch(() => {});
}

/* =====================================================
   🎛 Change panel mapping
===================================================== */
const PANEL_PREFIX = {
  contact_owner: "c-owner",
  help_info: "h-info",
  report_staff: "rs",
  report_member: "rm",
};

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
        report_member: `rm-${id}`,
      };

      const channel = await guild.channels.create({
        name: names[option] ?? `ticket-${id}`,
        type: ChannelType.GuildText,
        topic: `Ticket creat de ${user.tag} | Tip: ${option}`,
      });

      ticketPerms.applyInitialPermissions(
        channel,
        user.id,
        perms.roles.tier1,
        perms.roles.tier2
      );

      await DB.addTicket(channel.id, user.id);

      const sent = await channel.send({
        content: `<@&${STAFF_ROLE}> <@${user.id}>`,
        embeds: [
          new EmbedBuilder()
            .setColor("Purple")
            .setTitle("🎫 Tichet creat")
            .setDescription(`Salut <@${user.id}>, ticketul tău a fost creat.`),
        ],
        components: [getTicketButtons({ claimedBy: null })],
      });

      // dacă ai funcția în DB, salvează messageId (recomandat)
      if (typeof DB.setTicketMessage === "function") {
        await DB.setTicketMessage(channel.id, sent.id).catch(() => {});
      } else {
        // fallback: pune-l direct în obiect dacă modelul are messageId
        // (nu stricăm nimic dacă nu există)
        try {
          const t = await DB.getTicket(channel.id);
          if (t && "messageId" in t) {
            t.messageId = sent.id;
            await t.save?.();
          }
        } catch {}
      }

      return interaction.reply({ content: "🎟 Tichet deschis!", ephemeral: true });
    }

    /* =====================================================
       🔁 CHANGE PANEL (DROPDOWN)  ✅ IMPORTANT: înainte de isButton()
    ===================================================== */
    if (interaction.isStringSelectMenu() && interaction.customId === "change_panel_select") {
      const channel = interaction.channel;
      const member = interaction.member;
      const newPanel = interaction.values[0];

      if (!channel) return interaction.reply({ content: "❌ Canal invalid.", ephemeral: true });

      const ticket = await DB.getTicket(channel.id);
      if (!ticket) {
        return interaction.reply({ content: "❌ Nu este ticket.", ephemeral: true });
      }

      // doar claimer sau tier2
      if (ticket.claimedBy !== member.id && !perms.isTier2(member)) {
        return interaction.reply({
          content: "❌ Doar claimerul sau Tier2 poate schimba panelul.",
          ephemeral: true,
        });
      }

      await interaction.deferUpdate(); // nu mai timeout

      const prefix = PANEL_PREFIX[newPanel] || "ticket";
      const suffix = channel.name.split("-").pop(); // păstrăm id-ul
      const newName = `${prefix}-${suffix}`;

      await channel.setName(newName).catch(() => {});
      await channel
        .setTopic(`Ticket creat de <@${ticket.userId}> | Tip: ${newPanel}`)
        .catch(() => {});

      // 🔥 auto-unclaim + reset perms
      ticket.claimedBy = null;
      await ticket.save?.().catch(() => {});

      ticketPerms.applyInitialPermissions(
        channel,
        ticket.userId,
        perms.roles.tier1,
        perms.roles.tier2
      );

      // 🔁 update butoane în mesajul principal
      await safeEditMainButtons(channel, ticket);

      // scoatem dropdown-ul (mesajul de changepannel)
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ Panel schimbat")
            .setDescription(
              `Panel schimbat în **${newPanel.replaceAll("_", " ")}**.\nTicketul a fost **unclaim automat**.`
            ),
        ],
        components: [],
      });
    }

    /* =====================================================
       ⭐ RATING BUTTONS (DM)
    ===================================================== */
    if (interaction.isButton() && interaction.customId.startsWith("rate_")) {
      const [, staffId, value] = interaction.customId.split("_");
      const rating = Number(value);

      if (!rating || rating < 1 || rating > 5) {
        return interaction.reply({ content: "❌ Rating invalid.", ephemeral: true });
      }

      if (await DB.hasUserRated(staffId, interaction.user.id)) {
        return interaction.reply({ content: "⚠️ Ai oferit deja un rating.", ephemeral: true });
      }

      await DB.addStaffRating(staffId, interaction.user.id, rating);

      const disabledRow = new ActionRowBuilder().addComponents(
        [1, 2, 3, 4, 5].map((n) =>
          new ButtonBuilder()
            .setCustomId(`disabled_${n}`) // unic
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
            .setDescription(`Ai acordat **${rating}⭐** staff-ului <@${staffId}>.`),
        ],
        components: [disabledRow],
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
            .setTimestamp(),
        ],
      });

      return;
    }

    /* =====================================================
       🔘 BUTTONS (Ticket)
    ===================================================== */
    if (!interaction.isButton()) return;

    const channel = interaction.channel;
    const member = interaction.member;

    if (!channel) return;
    const ticket = await DB.getTicket(channel.id);
    if (!ticket) return;

    /* ================= CLAIM ================= */
    if (interaction.customId === "claim_ticket") {
      if (!perms.isTier1(member) && !perms.isTier2(member)) {
        return interaction.reply({ content: "❌ Nu ai permisiune.", ephemeral: true });
      }

      if (ticket.claimedBy) {
        return interaction.reply({
          content: `⚠️ Ticket deja revendicat de <@${ticket.claimedBy}>.`,
          ephemeral: true,
        });
      }

      ticket.claimedBy = member.id;
      await ticket.save?.();

      await DB.incrementStaffTickets(member.id).catch(() => {});

      ticketPerms.applyClaim(
        channel,
        member.id,
        ticket.userId,
        perms.roles.tier1,
        perms.roles.tier2
      );

      // ✅ update butoane -> apare Unclaim
      await safeEditMainButtons(channel, ticket);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(`📌 Ticket revendicat de <@${member.id}>`),
        ],
      });
    }

    /* ================= UNCLAIM ================= */
    if (interaction.customId === "unclaim_ticket") {
      if (ticket.claimedBy !== member.id) {
        return interaction.reply({ content: "❌ Doar claimerul poate da unclaim.", ephemeral: true });
      }

      ticket.claimedBy = null;
      await ticket.save?.();

      ticketPerms.applyInitialPermissions(
        channel,
        ticket.userId,
        perms.roles.tier1,
        perms.roles.tier2
      );

      // ✅ update butoane -> revine Claim
      await safeEditMainButtons(channel, ticket);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Orange")
            .setDescription(`ℹ️ Ticket eliberat de <@${member.id}>`),
        ],
      });
    }

    /* ================= CLOSE CONFIRM ================= */
    if (interaction.customId === "close_ticket") {
      if (!ticket.claimedBy) {
        return interaction.reply({ content: "❌ Ticketul trebuie revendicat.", ephemeral: true });
      }

      if (ticket.claimedBy !== member.id && !perms.isTier2(member)) {
        return interaction.reply({
          content: "❌ Doar claimerul sau Tier2 poate închide.",
          ephemeral: true,
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
            .setDescription("❗ Ești sigur că vrei să închizi ticketul?"),
        ],
        components: [row],
        ephemeral: true,
      });
    }

    if (interaction.customId === "cancel_close") {
      return interaction.update({
        content: "❌ Închidere anulată.",
        embeds: [],
        components: [],
      });
    }

    /* ================= FINAL CLOSE ================= */
    if (interaction.customId === "confirm_close") {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});

      let url = "N/A";
      try {
        const html = await transcriptSys.generateTranscript(channel);
        url = await githubUploader.uploadTranscript(html, `${channel.id}.html`);
      } catch (e) {
        // dacă transcriptul pică, nu omorâm close-ul
        console.error("Transcript error:", e);
      }

      // LOG CHANNEL
      const log = interaction.guild.channels.cache.get(LOG_CHANNEL);
      log?.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Blurple")
            .setTitle("📄 Ticket închis")
            .addFields(
              { name: "User", value: `<@${ticket.userId}>`, inline: true },
              { name: "Staff", value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "N/A", inline: true },
              { name: "Transcript", value: url !== "N/A" ? `[Vezi aici](${url})` : "Eroare transcript" }
            )
            .setTimestamp(),
        ],
      });

      // DM USER (transcript + rating)
      try {
        const usr = await interaction.guild.members.fetch(ticket.userId);

        if (url !== "N/A") {
          await usr.send({
            embeds: [
              new EmbedBuilder()
                .setColor("Purple")
                .setTitle("📄 Transcript ticket")
                .setDescription(`[Vezi transcript](${url})`),
            ],
          });
        } else {
          await usr.send({
            embeds: [
              new EmbedBuilder()
                .setColor("Purple")
                .setTitle("📄 Ticket închis")
                .setDescription("Ticketul a fost închis, dar transcriptul nu a putut fi generat."),
            ],
          });
        }

        // rating only dacă există claimer
        if (ticket.claimedBy) {
          const ratingRow = new ActionRowBuilder().addComponents(
            [1, 2, 3, 4, 5].map((n) =>
              new ButtonBuilder()
                .setCustomId(`rate_${ticket.claimedBy}_${n}`)
                .setLabel("⭐".repeat(n))
                .setStyle(ButtonStyle.Secondary)
            )
          );

          await usr.send({
            embeds: [
              new EmbedBuilder()
                .setColor("Gold")
                .setTitle("⭐ Evaluează staff-ul")
                .setDescription(`Staff: <@${ticket.claimedBy}>`),
            ],
            components: [ratingRow],
          });
        }
      } catch {}

      await DB.deleteTicket(channel.id).catch(() => {});
      await interaction.editReply({ content: "✅ Ticket închis.", embeds: [], components: [] }).catch(() => {});

      return channel.delete().catch(() => {});
    }
  });
};
