const { EmbedBuilder } = require("discord.js");
const embeds = require('../utils/embedBuilder');
const perms = require('../utils/permissions');
const db = require('../utils/db');
const constants = require('../utils/constants');

const ICON_URL = "https://cdn.discordapp.com/attachments/1304968969677045770/1448370644860534934/ChatGPT_Image_10_dec._2025_19_46_12.png";

module.exports = {
  name: "ban",
  async execute(message, args) {

    const member = message.member;

    if (!(perms.canBan(member) || perms.isTier2(member))) {
      return message.reply({ embeds: [embeds.error("Eroare", "Nu ai permisiunea să dai ban.")] });
    }

    const target = message.mentions.members.first();
    if (!target)
      return message.reply({ embeds: [embeds.error("Eroare", "Trebuie să menționezi un membru.")] });

    const reason = args.slice(1).join(" ");
    if (!reason)
      return message.reply({ embeds: [embeds.error("Eroare", "Motiv obligatoriu.")] });

    if (!target.bannable)
      return message.reply({ embeds: [embeds.error("Eroare", "Nu pot bana acest membru.")] });

    // ========================================================
    // 📩 DM — Embed profesional
    // ========================================================
    const dmEmbed = new EmbedBuilder()
      .setColor("Red")
      .setTitle(`⛔ Ai fost BANAT | ${message.guild.name}`)
      .setThumbnail(ICON_URL)
      .setDescription(
        `> 🧍‍♂️ **User:** ${target.user.tag}\n` +
        `> 🛡 **Staff:** ${message.author.tag}\n` +
        `> 📝 **Motiv:** ${reason}\n\n` +
        `Dacă dorești să faci cerere de unban, intră pe:\n` +
        `🔗 **https://discord.gg/Be4ZtNMQts**`
      )
      .setFooter({ text: `ID: ${target.id} • ${new Date().toLocaleString()}` });

    try {
      await target.send({ embeds: [dmEmbed] });
    } catch {}

    // ========================================================
    // 🔨 Aplicăm BAN-ul
    // ========================================================
    try {
      await target.ban({ reason });
    } catch {
      return message.reply({ embeds: [embeds.error("Eroare", "Nu pot aplica ban-ul.")] });
    }

    // ========================================================
    // 📊 ADAUGĂ BAN ÎN RAPORT — (READY TO USE)
    // ========================================================
    await db.ensureStaffRecord(message.author.id);
    await db.incrementStaffField(message.author.id, "bansGiven");

    // Salvăm și ban-ul în tabela de sancțiuni
    await db.addBan(target.id, message.author.id, reason);


    // ========================================================
    // 📌 EMBED — LOG SANCTION
    // ========================================================
    const banEmbed = new EmbedBuilder()
      .setColor("Red")
      .setTitle(`🔨 Ban aplicat | ${message.guild.name}`)
      .setThumbnail(ICON_URL)
      .setDescription(
        `> 🧍‍♂️ **User:** <@${target.id}>\n` +
        `> 🛡 **Staff:** <@${message.author.id}>\n` +
        `> 📝 **Motiv:** ${reason}`
      )
      .setFooter({ text: `ID: ${target.id} • ${new Date().toLocaleString()}` });

    const sanctionLog = message.guild.channels.cache.get(constants.SANCTION_LOGS);
    if (sanctionLog) sanctionLog.send({ embeds: [banEmbed] });

    // ========================================================
    // 📌 LOG secundar
    // ========================================================
    const MAIN_BAN_LOG = "1447896593041719348";
    const log2 = message.guild.channels.cache.get(MAIN_BAN_LOG);
    if (log2) log2.send({ embeds: [banEmbed] });

    // ========================================================
    // 📩 REPLY STAFF
    // ========================================================
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Green")
          .setTitle("Ban aplicat cu succes")
          .setDescription(`Utilizatorul **${target.user.tag}** a fost banat.`)
          .setThumbnail(ICON_URL)
      ]
    });
  }
};
