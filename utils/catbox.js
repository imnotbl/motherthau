const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

module.exports.uploadFile = async (filePath) => {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fs.createReadStream(filePath));

    const res = await axios.post("https://catbox.moe/user/api.php", form, {
        headers: form.getHeaders(),
    });

    return res.data; // returnează link-ul final
};
