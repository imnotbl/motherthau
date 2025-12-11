const { EmbedBuilder } = require("discord.js");

module.exports = (client) => {

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== "help_menu") return;

    let embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setTimestamp();

    const choice = interaction.values[0];

    // ------------------------------
    // USER
    // ------------------------------
    if (choice === "user") {
      embed
        .setTitle("👤 Comenzi utilizator")
        .setDescription(`
### 📘 Help
\`#help\` – Meniul de ajutor

### 📊 Raport
\`#raport\` – Vezi raportul tău complet
        `);
    }

    // ------------------------------
    // MODERARE
    // ------------------------------
    if (choice === "mod") {
      embed
        .setTitle("🛠 Comenzi de moderare")
        .setDescription(`
### ⚠️ Warn
\`#warn @user motiv\`

### 🔇 Mute
\`#cmute @user motiv\`  
\`#vmute @user motiv\`  
\`#vunmute @user\`

### 🔨 Ban
\`#ban @user motiv\`  
\`#unban userId motiv\`
        `);
    }

    // ------------------------------
    // TICKETE
    // ------------------------------
    if (choice === "ticket") {
      embed
        .setTitle("🎫 Comenzi Tickete")
        .setDescription(`
### 👥 Management Ticket
\`#add @user\` – Adaugă în ticket  
\`#remove @user\` – Scoate din ticket  

### 🏗 Setup Sistem
\`#setupticket\` – Creează panoul de tichete
        `);
    }

    // ------------------------------
    // STAFF MANAGEMENT
    // ------------------------------
    if (choice === "staff") {
      embed
        .setTitle("👑 Comenzi Staff Management")
        .setDescription(`
### ⚠️ Staff Warn
\`#swarn @staff motiv\`  
\`#delsw @staff\`

### 📊 Rapoarte Staff
\`#checkraportstaff\`  
\`#resetraportstaff\`
        `);
    }

    // ------------------------------
    // ADMIN / UTILITY
    // ------------------------------
    if (choice === "admin") {
      embed
        .setTitle("📦 Comenzi Admin / Utility")
        .setDescription(`
### 🎭 Role Manager
\`#addrole <iduser> <idrol>\`  
\`#removerole <iduser> <idrol>\`  
\`#massaddrole <idrol>\`
        `);
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  });
};
