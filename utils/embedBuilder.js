const { EmbedBuilder } = require('discord.js');
const logo = "attachment://awoken_logo.webp"; // thumbnail + footer icon

module.exports = {
    success(title, desc) {
        return new EmbedBuilder()
            .setColor('#00FF7F') // Verde frumos
            .setTitle(`✅ ${title}`)
            .setDescription(desc)
            .setThumbnail(logo)
            .setFooter({ text: "Awoken System", iconURL: logo })
            .setTimestamp();
    },

    error(title, desc) {
        return new EmbedBuilder()
            .setColor('#FF3D3D') // Roșu elegant
            .setTitle(`❌ ${title}`)
            .setDescription(desc)
            .setThumbnail(logo)
            .setFooter({ text: "Awoken System", iconURL: logo })
            .setTimestamp();
    },

    info(title, desc) {
        return new EmbedBuilder()
            .setColor('#5865F2') // Blurple Discord
            .setTitle(`ℹ️ ${title}`)
            .setDescription(desc)
            .setThumbnail(logo)
            .setFooter({ text: "Awoken System", iconURL: logo })
            .setTimestamp();
    }
};
