const embeds = require('../utils/embedBuilder');
const perms = require('../utils/permissions');
const constants = require('../utils/constants');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "unban",
  async execute(message, args) {

    const ICON = "https://cdn.discordapp.com/attachments/1304968969677045770/1448370644860534934/ChatGPT_Image_10_dec._2025_19_46_12.png";

    const member = message.member;

    if (!(perms.canBan(member) || perms.isTier2(member))) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setThumbnail(ICON)
            .setTitle("❌ Nu ai permisiunea")
            .setDescription("Nu ai dreptul de a folosi comanda **unban**.")
        ]
      });
    }

    const userId = args[0];
    if (!userId) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setThumbnail(ICON)
            .setTitle("❌ Eroare")
            .setDescription("Trebuie să specifici **ID-ul utilizatorului**.")
        ]
      });
    }

    const reason = args.slice(1).join(" ");
    if (!reason) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setThumbnail(ICON)
            .setTitle("❌ Motiv necesar")
            .setDescription("Trebuie să adaugi un motiv pentru unban.")
        ]
      });
    }

    // -------------------------------------------------
    // 📩 TRIMITEM DM CĂTRE USER (EMBED PREMIUM)
    // -------------------------------------------------
    try {
      const unbannedUser = await message.client.users.fetch(userId);

      const dmEmbed = new EmbedBuilder()
        .setColor("Green")
        .setThumbnail(ICON)
        .setTitle("🔓 Ai primit UNBAN")
        .setDescription(`
> 🧍‍♂️ **User:** <@${userId}>
> 🛡 **Staff:** <@${message.author.id}>
> 📝 **Motiv:** ${reason}

Poți intra din nou pe server. Bine ai revenit!
        `)
        .setFooter({ text: `ID: ${userId} • ${new Date().toLocaleString()}` });

      await unbannedUser.send({ embeds: [dmEmbed] }).catch(() => {});
    } catch {}


    // -------------------------------------------------
    // 🔨 EXECUTĂM UNBAN-UL
    // -------------------------------------------------
    try {
      await message.guild.bans.remove(userId, reason);
    } catch (err) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setThumbnail(ICON)
            .setTitle("❌ Unban eșuat")
            .setDescription("Userul nu este banat sau ID-ul este invalid.")
        ]
      });
    }

    // -------------------------------------------------
    // LOG #1 — SANCTION LOGS (premium embed)
    // -------------------------------------------------
    const sanctionLog = message.guild.channels.cache.get(constants.SANCTION_LOGS);
    if (sanctionLog) {
      sanctionLog.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#2ecc71")
            .setThumbnail(ICON)
            .setTitle("🔓 Unban efectuat")
            .setDescription(`
> 🧍‍♂️ **User:** <@${userId}>
> 🛡 **Staff:** <@${message.author.id}>
> 📝 **Motiv:** ${reason}
            `)
            .setFooter({ text: `ID: ${userId} • ${new Date().toLocaleString()}` })
        ]
      });
    }

    // -------------------------------------------------
    // LOG #2 — BAN/UNBAN MAIN LOG
    // -------------------------------------------------
    const MAIN_LOG = "1447896593041719348";
    const mainLog = message.guild.channels.cache.get(MAIN_LOG);

    if (mainLog) {
      mainLog.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#27ae60")
            .setThumbnail(ICON)
            .setTitle("🔓 Unban Log")
            .setDescription(`
> 🧍‍♂️ **User:** <@${userId}>
> 🛡 **Staff:** <@${message.author.id}>
> 📝 **Motiv:** ${reason}
            `)
            .setFooter({ text: `ID: ${userId} • ${new Date().toLocaleString()}` })
        ]
      });
    }

    // -------------------------------------------------
    // RĂSPUNS CĂTRE STAFF — embed premium
    // -------------------------------------------------
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Green")
          .setThumbnail(ICON)
          .setTitle("🔓 Unban realizat")
          .setDescription(`
<@${userId}> a fost **debănat** cu succes.

> 📝 Motiv: **${reason}**
> 🛡 Staff: <@${message.author.id}>
          `)
          .setFooter({ text: `ID: ${userId} • ${new Date().toLocaleString()}` })
      ]
    });

  }
};
