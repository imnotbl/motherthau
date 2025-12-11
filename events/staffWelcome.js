// events/staffWelcome.js
const { EmbedBuilder } = require("discord.js");

module.exports = (client) => {
    const STAFF_ROLE_ID = "1447684240966815977";
    const STAFF_SERVER_INVITE = "https://discord.gg/7696G2qphd";

    client.on("guildMemberUpdate", async (oldMember, newMember) => {

        // dacă deja avea rolul → ignorăm
        if (oldMember.roles.cache.has(STAFF_ROLE_ID)) return;

        // dacă abia acum a primit rolul
        if (!oldMember.roles.cache.has(STAFF_ROLE_ID) && newMember.roles.cache.has(STAFF_ROLE_ID)) {

            // creăm embed-ul
            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("🎉 Bine ai venit în STAFF-ul Awoken!")
                .setDescription(`
Felicitări pentru promovare! 🥳  
De acum faci parte din echipa staff.

🔗 **Server Staff:**  
${STAFF_SERVER_INVITE}

Dacă ai întrebări, te ajutăm cu drag!
                `)
                .setTimestamp();

            // trimitem DM
            try {
                await newMember.send({ embeds: [embed] });
            } catch {
                console.log(`❌ Nu am putut trimite DM lui ${newMember.user.tag}`);
            }
        }
    });
};
