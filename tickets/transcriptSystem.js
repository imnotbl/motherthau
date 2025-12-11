const escape = require("escape-html");

module.exports = {
    async generateTranscript(channel) {

        let messages = [];
        let lastId;

        // Fetch ALL messages
        while (true) {
            const fetched = await channel.messages.fetch({
                limit: 100,
                before: lastId
            });

            if (fetched.size === 0) break;

            messages.push(...fetched.values());
            lastId = fetched.last().id;
        }

        messages.reverse();

        let html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Transcript - ${channel.name}</title>
            <style>
                body {
                    background: #0d0f14;
                    color: white;
                    font-family: Arial, sans-serif;
                    padding: 20px;
                }

                .container {
                    max-width: 900px;
                    margin: auto;
                }

                .message {
                    display: flex;
                    padding: 14px;
                    background: #1a1d24;
                    border-radius: 10px;
                    margin-bottom: 12px;
                    border: 1px solid #2a2f3a;
                }

                .avatar {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    margin-right: 15px;
                }

                .username {
                    font-weight: bold;
                    font-size: 16px;
                    color: #dfdfdf;
                }

                .time {
                    font-size: 12px;
                    margin-left: 8px;
                    color: #8a8f98;
                }

                .content {
                    margin-top: 5px;
                    color: #dcdcdc;
                    white-space: pre-wrap;
                }

                .attachment {
                    margin-top: 8px;
                }

                .attachment a {
                    color: #4da3ff;
                    text-decoration: none;
                }

                .embed-container {
                    margin-top: 10px;
                }

                .embed {
                    border-left: 4px solid #5865F2;
                    background: #16181d;
                    padding: 10px;
                    border-radius: 6px;
                }

                .embed-title {
                    font-weight: bold;
                    color: white;
                    margin-bottom: 4px;
                }

                .embed-desc {
                    color: #b4b4b4;
                }

            </style>
        </head>
        <body>
            <div class="container">
                <h1>Transcript — ${channel.name}</h1>
                <hr>
        `;

        for (const m of messages) {
            const time = new Date(m.createdTimestamp).toLocaleString("ro-RO");

            html += `
                <div class="message">
                    <img class="avatar" src="${m.author.displayAvatarURL({ size: 1024 })}">
                    <div>
                        <span class="username">${escape(m.author.tag)}</span>
                        <span class="time">${time}</span>

                        <div class="content">${escape(m.content || "")}</div>
            `;

            // Attachments
            if (m.attachments.size > 0) {
                html += `<div class="attachment">`;
                m.attachments.forEach(att => {
                    html += `<a href="${att.url}" target="_blank">📎 Attachment: ${att.name}</a><br>`;
                });
                html += `</div>`;
            }

            // Embeds
            if (m.embeds.length > 0) {
                html += `<div class="embed-container">`;

                m.embeds.forEach(embed => {
                    html += `<div class="embed">`;

                    if (embed.title) {
                        html += `<div class="embed-title">${escape(embed.title)}</div>`;
                    }

                    if (embed.description) {
                        html += `<div class="embed-desc">${escape(embed.description)}</div>`;
                    }

                    html += `</div>`;
                });

                html += `</div>`;
            }

            html += `
                    </div>
                </div>
            `;
        }

        html += `
            </div>
        </body>
        </html>
        `;

        return html;
    }
};
