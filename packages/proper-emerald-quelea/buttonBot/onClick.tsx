const files = await os.showUploadFiles();
os.toast("You uploaded " + files.length + " file(s)!");

os.log(files);

const bot = getBot(byTag("sn_components"));

const recordKeyResult = await os.getPublicRecordKey('RSB Study Note v1');
if (!recordKeyResult.success) {
    os.toast("Failed to get a record key! " + recordKeyResult.errorMessage);
    return;
}

// after you get `files` from os.showUploadFiles()
files.forEach( async file => {
    // 1️⃣ derive your tag name:
    const [tagName] = file.name.split('.');      // e.g. "lev" from "lev_study_notes.json"

    // 2️⃣ parse the JSON payload:
    let parsed;
    try {
        parsed = JSON.parse(file.data);
    } catch (err) {
        console.error(`Could not parse ${file.name} as JSON`, err);
        return;
    }

    const result = await os.recordFile(recordKeyResult.recordKey, parsed);

    if (result.success) {
        bot.tags[tagName] = result.url;
        console.log("result: ", result);
        os.toast("Success! Uploaded to " + result.url);
    } else {
        os.toast("Failed " + result.errorMessage);
    }

    console.log(`Created tag bot.tags.${tagName}`, bot.tags[tagName]);
});
