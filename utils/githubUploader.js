const axios = require("axios");

const OWNER = "imnotbl";
const REPO = "awoken-transcript";
const BRANCH = "main";
const TOKEN = process.env.GITHUB_TOKEN;

const api = axios.create({
    baseURL: "https://api.github.com",
    timeout: 10000,
    headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${TOKEN}`,
        "User-Agent": "awoken-bot"
    }
});

async function uploadTranscript(html, fileName) {
    if (!TOKEN) throw new Error("GITHUB_TOKEN lipsă");

    const path = `transcripts/${fileName}`;
    const content = Buffer.from(html).toString("base64");

    let sha;
    try {
        const res = await api.get(`/repos/${OWNER}/${REPO}/contents/${path}`);
        sha = res.data.sha;
    } catch (e) {
        if (e.response?.status !== 404) throw e;
    }

    await api.put(`/repos/${OWNER}/${REPO}/contents/${path}`, {
        message: `${sha ? "Update" : "Add"} transcript ${fileName}`,
        content,
        branch: BRANCH,
        ...(sha && { sha })
    });

    return `https://${OWNER}.github.io/${REPO}/${path}`;
}

module.exports = { uploadTranscript };
