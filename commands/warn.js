const embeds = require('../utils/embedBuilder');
const perms = require('../utils/permissions');
const db = require('../utils/db');
const staffStats = require('../utils/staffStats');

module.exports = {
    name: "warn",
    async execute(message, args) {

        const staff = message.member;

        // --------------------------
        // PERMISSION CHECK
        // --------------------------
        if (
            !(
                perms.isTier1(staff) ||
                perms.canWarnMute(staff) ||
                perms.canBan(staff) ||
                perms.isTier2(staff)
            )
        ) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Nu ai permisiunea să dai warn.")]
            });
        }

        // --------------------------
        // GET TARGET
        // --------------------------
        const target = message.mentions.members.first();
        if (!target) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Menționează un membru.")]
            });
        }

        // --------------------------
        // REASON
        // --------------------------
        const reason = args.slice(1).join(" ");
        if (!reason) {
            return message.reply({
                embeds: [embeds.error("Eroare", "Trebuie să specifici un motiv.")]
            });
        }

        // --------------------------
        // DELETE EXPIRED WARNS
        // --------------------------
        db.deleteExpiredWarns();

        const WARN_DURATION = 15 * 60 * 1000;

        // --------------------------
        // CHECK ACTIVE WARN
        // --------------------------
        db.getActiveWarn(target.id, async (activeWarn) => {

            if (activeWarn) {
                const now = Date.now();
                const remaining = Math.ceil((WARN_DURATION - (now - activeWarn.timestamp)) / 60000);

                return message.reply({
                    embeds: [
                        embeds.error(
                            "Eroare",
                            `Acest user are deja un warn activ.\nMai poți da warn peste **${remaining} minute**.`
                        )
                    ]
                });
            }

            // --------------------------
            // ADD DB ENTRY
            // --------------------------
            await db.addWarn(target.id, message.author.id, reason);

            // --------------------------
            // UPDATE STAFF REPORT
            // --------------------------
            await staffStats.addWarnStaff(message.author.id);

            // --------------------------
            // OLD STYLE EMBED (NEMODIFICAT)
            // --------------------------
            const commandEmbed = {
                color: 0xffcc00,
                author: {
                    name: `Warn | ${target.user.username}`,
                    icon_url: target.user.displayAvatarURL({ dynamic: true })
                },
                fields: [
                    {
                        name: "📦 User",
                        value: `${target.user.tag}`,
                        inline: true
                    },
                    {
                        name: "🛡️ Staff",
                        value: `${message.author.tag}`,
                        inline: true
                    },
                    {
                        name: "🧾 Motiv",
                        value: reason,
                        inline: false
                    }
                ],
                footer: {
                    text: `ID: ${target.id} • ${new Date().toLocaleString("ro-RO")}`
                }
            };

            message.reply({ embeds: [commandEmbed] });

            // --------------------------
            // SEND DM TO USER
            // --------------------------
            target.send({
                embeds: [
                    {
                        color: 0xffcc00,
                        title: "Ai primit un warn",
                        fields: [
                            { name: "📝 Motiv", value: reason },
                            { name: "👮 Staff", value: `<@${message.author.id}>` }
                        ],
                        timestamp: new Date()
                    }
                ]
            }).catch(() => {});

        });
    }
};
