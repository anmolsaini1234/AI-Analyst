let uploadedFilePath = "";

function setFilePath(path) {
    console.log("SETTING FILE PATH:", path);
    uploadedFilePath = path;
}

function getFilePath() {
    console.log("GETTING FILE PATH:", uploadedFilePath);
    return uploadedFilePath;
}

module.exports = {
    setFilePath,
    getFilePath
};