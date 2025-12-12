const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require("discord.js");

const HELP_BANNER =
  "https://cdn.discordapp.com/attachments/1304968969677045770/1448370644860534934/ChatGPT_Image_10_dec._2025_19_46_12.png";

module.exports = {
  name: "help",
  description: "Meniul complet de comenzi Awoken.",

  async execute(message) {
    const main = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📘 Awoken Help Menu")
      .setDescription(
        "Selectează categoria pentru a vedea comenzile disponibile.\n\n" +
        "🔹 Ticket system avansat\n" +
        "🔹 Moderare & staff management\n" +
        "🔹 Rating staff & rapoarte"
      )
      .setThumbnail(message.client.user.displayAvatarURL())
      .setImage(HELP_BANNER)
      .setFooter({ text: "Awoken Bot • Help Menu" })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId("help_menu")
      .setPlaceholder("Alege categoria...")
      .addOptions([
        {
          label: "👤 Utilizator",
          value: "user",
          description: "Comenzi generale"
        },
        {
          label: "🛠 Moderare",
          value: "mod",
          description: "Warn, mute, cunmute, ban"
        },
        {
          label: "🎫 Tickete",
          value: "ticket",
          description: "Claim, unclaim, close, changepannel"
        },
        {
          label: "👑 Management Staff",
          value: "staff",
          description: "Rapoarte, rating, statistici"
        },
        {
          label: "📦 Admin / Utility",
          value: "admin",
          description: "Resetări și utilitare"
        }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await message.channel.send({
      embeds: [main],
      components: [row]
    });
  }
};
