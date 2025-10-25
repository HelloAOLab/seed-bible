const files = await os.showUploadFiles();
const file = files?.[0];

if (!file) {
  return ShowNotification({
    message: "No File Uploaded!",
    severity: "error",
  });
}

const filesPromises = [];

files.forEach((file: any) => {
  filesPromises.push(
    os.recordFile(globalThis.RECORD_STOREKEY, file.data, {
      name: file.name,
      mimeType: file.mimeType,
    })
  );
});

try {
  const failCount = 0;
  const fileSave = await Promise.all(filesPromises);
  const filesResult = [];

  fileSave.forEach(({ success, url, existingFileUrl, errorCode }, index) => {
    if (!success && errorCode !== "file_already_exists") {
      failCount++;
      return;
    }
    filesResult.push({
      content: files[index].name,
      id: createUUID(),
      link: url || existingFileUrl,
      additionalInfo: {
        link: url || existingFileUrl,
        mimeType: files[index].mimeType,
        type: "file",
        isValid: true,
      },
      type: "attachment-link",
    });
  });

  console.log("Here are your files", filesResult);

  // Example for using one of the uploaded file URLs
  // const url = fileSave[0]?.url || fileSave[0]?.existingFileUrl;

  if (failCount > 0) {
    return ShowNotification({
      message: "Failed to upload some Files!",
      severity: "error",
    });
  }
} catch (error) {
  console.log(error);
  ShowNotification({
    message: "File upload failed!",
    severity: "error",
  });
}
