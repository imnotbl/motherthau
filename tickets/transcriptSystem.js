// tickets/transcriptSystem.js
// Generează HTML PREMIUM pentru transcript

const escape = require("escape-html");

module.exports = {
    async generateTranscript(channel) {
        let messages = [];
        let lastId;

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
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8" />
    <title>Transcript - ${escape(channel.name)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
        :root {
            color-scheme: dark;
        }
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: radial-gradient(circle at top left, #3b82f6 0, #020617 55%);
            color: #e5e7eb;
        }
        header {
            position: sticky;
            top: 0;
            z-index: 10;
            backdrop-filter: blur(18px);
            background: linear-gradient(to right, rgba(15,23,42,0.96), rgba(15,23,42,0.85));
            border-bottom: 1px solid rgba(148,163,184,0.3);
            padding: 14px 26px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        header .title {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        header .pill {
            padding: 3px 10px;
            border-radius: 999px;
            font-size: 11px;
            letter-spacing: .08em;
            text-transform: uppercase;
            border: 1px solid rgba(148,163,184,0.5);
            color: #e5e7eb;
        }
        header h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        header .meta {
            font-size: 12px;
            color: #9ca3af;
        }
        main {
            max-width: 980px;
            margin: 20px auto 40px auto;
            padding: 0 16px 32px 16px;
        }
        .msg {
            display: flex;
            gap: 10px;
            padding: 10px 14px;
            margin-bottom: 6px;
            border-radius: 10px;
            background: rgba(15,23,42,0.78);
            border: 1px solid rgba(30,64,175,0.5);
            box-shadow: 0 18px 45px rgba(15,23,42,0.8);
        }
        .msg:hover {
            border-color: rgba(59,130,246,0.9);
            box-shadow: 0 0 0 1px rgba(59,130,246,0.4);
            transform: translateY(-1px);
            transition: all 120ms ease-out;
        }
        .avatar {
            flex-shrink: 0;
        }
        .avatar img {
            width: 36px;
            height: 36px;
            border-radius: 999px;
            object-fit: cover;
            border: 1px solid rgba(59,130,246,0.6);
        }
        .content-wrapper {
            flex: 1;
            min-width: 0;
        }
        .author-line {
            display: flex;
            align-items: baseline;
            gap: 8px;
        }
        .author {
            font-weight: 600;
            font-size: 14px;
        }
        .time {
            font-size: 11px;
            color: #9ca3af;
        }
        .content {
            margin-top: 4px;
            font-size: 14px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .attach, .embed-note {
            margin-top: 6px;
            font-size: 12px;
            color: #bfdbfe;
        }
        .attach a {
            color: #60a5fa;
            text-decoration: none;
        }
        .attach a:hover {
            text-decoration: underline;
        }
        footer {
            max-width: 980px;
            margin: 0 auto 22px auto;
            padding: 0 16px;
            font-size: 11px;
            color: #6b7280;
            text-align: right;
        }
    </style>
</head>
<body>
<header>
    <div class="title">
        <div class="pill">Awoken Tickets</div>
        <div>
            <h1>#${escape(channel.name)}</h1>
            <div class="meta">Transcript generat automat • ${new Date().toLocaleString("ro-RO")}</div>
        </div>
    </div>
</header>
<main>
`;

        for (const m of messages) {
            const time = new Date(m.createdTimestamp).toLocaleString("ro-RO");
            const authorTag = escape(m.author.tag);
            const avatar = m.author.displayAvatarURL({ size: 64, extension: "png" });

            html += `
    <article class="msg">
        <div class="avatar">
            <img src="${avatar}" alt="${authorTag}" />
        </div>
        <div class="content-wrapper">
            <div class="author-line">
                <div class="author">${authorTag}</div>
                <div class="time">${time}</div>
            </div>
            <div class="content">${escape(m.content || "")}</div>
`;

            if (m.attachments.size > 0) {
                m.attachments.forEach(att => {
                    html += `<div class="attach">📎 Atașament: <a href="${att.url}">${att.url}</a></div>`;
                });
            }

            if (m.embeds.length > 0) {
                html += `<div class="embed-note">📘 Conținut embed inclus (nu poate fi redat complet aici).</div>`;
            }

            html += `
        </div>
    </article>
`;
        }

        html += `
</main>
<footer>
    Awoken Bot • Transcript HTML
</footer>
</body>
</html>`;

        return html;
    }
};
