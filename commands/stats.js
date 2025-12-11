const embeds = require('../utils/embedBuilder');
const db = require('../utils/db');

module.exports = {
  name: "stats",
  async execute(message, args) {
    const target = message.mentions.members.first() || message.member;

    db.get(`SELECT claimed FROM staff_ticket_stats WHERE userId = ?`, [target.id], (err, row) => {
      const claimed = row ? row.claimed : 0;

      const embed = embeds.info(
        `Statistici Staff pentru ${target.user.tag}`,
        `**Tickete preluate:** ${claimed}`
      );

      message.reply({ embeds: [embed] });
    });
  }
};
