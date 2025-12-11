// utils/githubUploader.js
const axios = require("axios");

const OWNER = "imnotbl";
const REPO = "awoken-transcript";
const BRANCH = "main"; // dacă repo-ul tău e pe "master", schimbă aici în "master"

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
    console.warn("[GitHubUploader] ATENȚIE: GITHUB_TOKEN nu este setat în variabilele de mediu!");
}

/**
 * Upload / update transcript HTML în repo-ul GitHub.
 * @param {string} html - conținutul HTML complet al transcriptului
 * @param {string} fileName - ex: "1448786751643582716.html"
 * @returns {Promise<string>} - URL-ul public al transcriptului pe GitHub Pages
 */
async function uploadTranscript(html, fileName) {
    if (!GITHUB_TOKEN) {
        throw new Error("GITHUB_TOKEN nu este setat în environment (Railway).");
    }

    const path = `transcripts/${fileName}`; // NU url-encode, GitHub vrea / nu %2F
    const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

    const content = Buffer.from(html, "utf8").toString("base64");

    const headers = {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "awoken-bot"
    };

    let sha = null;

    // 1. Verificăm dacă fișierul există deja (ca să luăm SHA pentru update)
    try {
        const getRes = await axios.get(apiUrl, { headers });
        sha = getRes.data.sha;
    } catch (err) {
        if (err.response && err.response.status === 404) {
            sha = null; // fișier nou, e ok
        } else {
            console.error("Eroare la GET GitHub contents:", err.response?.data || err.message);
            throw err;
        }
    }

    // 2. PUT: create sau update
    const body = {
        message: `${sha ? "Update" : "Add"} transcript ${fileName}`,
        content,
        branch: BRANCH
    };

    if (sha) body.sha = sha;

    try {
        await axios.put(apiUrl, body, { headers });
    } catch (err) {
        console.error("Eroare la PUT GitHub contents:", err.response?.data || err.message);
        throw err;
    }

    // 3. Returnăm link-ul public de GitHub Pages
    const publicUrl = `https://${OWNER}.github.io/${REPO}/${path}`;
    return publicUrl;
}

module.exports = {
    uploadTranscript
};
