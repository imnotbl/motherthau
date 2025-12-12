const { EmbedBuilder } = require("discord.js");

module.exports = (client) => {

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== "help_menu") return;

    let embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setFooter({ text: "Awoken Bot • Help Menu" })
      .setTimestamp();

    const choice = interaction.values[0];

    // ------------------------------
    // USER
    // ------------------------------
    if (choice === "user") {
      embed
        .setTitle("👤 Comenzi Utilizator")
        .setDescription(`
### 📘 Help
\`#help\` – Meniul de ajutor

### 📊 Raport personal
\`#raport\` – Vezi raportul tău (staff)

### ⭐ Feedback
Rating staff – se oferă automat la închiderea ticketului
        `);
    }

    // ------------------------------
    // MODERARE
    // ------------------------------
    if (choice === "mod") {
      embed
        .setTitle("🛠 Comenzi Moderare")
        .setDescription(`
### ⚠️ Warn
\`#warn @user motiv\`

### 🔇 Mute
\`#cmute @user motiv\`  
\`#vmute @user motiv\`  

### 🔊 Unmute
\`#cunmute @user\`  
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
### 🏷 Management Ticket
\`/claim\` – Revendică ticket  
\`/unclaim\` – Eliberează ticket  
\`Close (buton)\` – Închide ticket  

### 🔁 Panel
\`#changepannel\` – Schimbă tipul ticketului (dropdown)

### 👥 Membri
\`#add @user\` – Adaugă user în ticket  
\`#remove @user\` – Scoate user din ticket  

### 🏗 Setup
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
### 📊 Rapoarte
\`#raport\` – Raport staff individual  
\`#checkraportstaff\` – Toți membrii staff  
\`#resetraportstaff\` – Reset + backup

### ⭐ Rating Staff
Rating primit automat la închiderea ticketului  
\`#deleteratingstaff @staff\` – Șterge rating (Tier2)

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

### ⚙️ Sistem
\`#reload\` – Reload bot  
\`#clear\` – Curăță mesaje
        `);
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  });
};
