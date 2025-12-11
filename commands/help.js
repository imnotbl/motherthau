const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require("discord.js");

const HELP_BANNER = "https://cdn.discordapp.com/attachments/1304968969677045770/1448370644860534934/ChatGPT_Image_10_dec._2025_19_46_12.png"; 
// înlocuiește cu bannerul tău dacă vrei

module.exports = {
  name: "help",
  description: "Meniul complet de comenzi Awoken.",
  
  async execute(message) {

    const main = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📘 Awoken Help Menu")
      .setDescription("Selectează categoria pentru a vedea toate comenzile disponibile.")
      .setThumbnail(message.client.user.displayAvatarURL()) // logo bot dreapta
      .setImage(HELP_BANNER) // banner mare sus
      .setFooter({ text: "Awoken Bot • Help Menu" })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId("help_menu")
      .setPlaceholder("Alege categoria...")
      .addOptions([
        { label: "👤 Utilizator", value: "user" },
        { label: "🛠 Moderare", value: "mod" },
        { label: "🎫 Tickete", value: "ticket" },
        { label: "👑 Management Staff", value: "staff" },
        { label: "📦 Admin / Utility", value: "admin" }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await message.channel.send({ embeds: [main], components: [row] });
  }
};
