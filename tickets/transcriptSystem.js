const escape = require("escape-html");

module.exports = {
    async generateTranscript(channel) {
        const messages = [];
        let lastId;

        while (true) {
            const fetched = await channel.messages.fetch({ limit: 100, before: lastId });
            if (!fetched.size) break;

            messages.push(...fetched.values());
            lastId = fetched.last().id;
        }

        messages.reverse();

        const ticketName = escape(channel.name);
        const now = new Date().toLocaleString("ro-RO");

        const renderMessage = (m) => {
            const time = new Date(m.createdTimestamp).toLocaleString("ro-RO");
            const content = m.content ? escape(m.content) : "";

            let html = `
<article class="msg">
    <div class="avatar">
        <img src="${m.author.displayAvatarURL({ size: 64 })}" />
    </div>
    <div class="content-wrapper">
        <div class="author-line">
            <span class="author">${escape(m.author.tag)}</span>
            <span class="time">${time}</span>
        </div>
        <div class="content">${content}</div>`;

            for (const att of m.attachments.values()) {
                html += `<div class="attach">📎 <a href="${att.url}">${att.url}</a></div>`;
            }

            if (m.embeds.length) {
                html += `<div class="embed-note">📘 Embed inclus</div>`;
            }

            return html + `</div></article>`;
        };

        return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8" />
<title>Transcript - ${ticketName}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${require("fs").readFileSync(__dirname + "/transcript.css", "utf8")}</style>
</head>
<body>
<header>
<h1>#${ticketName}</h1>
<small>Generat automat • ${now}</small>
</header>
<main>
${messages.map(renderMessage).join("")}
</main>
</body>
</html>`;
    }
};
