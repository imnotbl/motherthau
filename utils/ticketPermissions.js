const { PermissionsBitField } = require("discord.js");

module.exports = {

    applyInitialPermissions(channel, userId, tier1Roles, tier2Roles) {

        const allowBasic = [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.AttachFiles
        ];

        const staffAllow = [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
        ];

        channel.permissionOverwrites.set([
            {
                id: channel.guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },

            {
                id: userId,
                allow: allowBasic
            },

            // Tier1 poate vedea ticketul, dar nu îl poate scrie
            ...tier1Roles.map(r => ({
                id: r,
                allow: staffAllow
            })),

            // Tier2 poate vedea + scrie + claim
            ...tier2Roles.map(r => ({
                id: r,
                allow: allowBasic
            })),

            // BOT PERMISSIONS (OBLIGATORIU)
            {
                id: channel.client.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.ManageMessages
                ]
            }
        ]);
    },


    applyClaim(channel, claimerId, userId, tier1Roles, tier2Roles) {

        const userAllow = [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.AttachFiles
        ];

        channel.permissionOverwrites.set([
            {
                id: channel.guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },

            {
                id: userId,
                allow: userAllow
            },

            {
                id: claimerId,
                allow: userAllow
            },

            // Tier1 nu mai vede ticketul după ce e claimed
            ...tier1Roles.map(r => ({
                id: r,
                deny: [PermissionsBitField.Flags.ViewChannel]
            })),

            // Tier2 vede în continuare
            ...tier2Roles.map(r => ({
                id: r,
                allow: userAllow
            })),

            // BOT PERMISSIONS
            {
                id: channel.client.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.ManageMessages
                ]
            }
        ]);
    }
};
