

const files = await os.showUploadFiles()
if (files.lenght === 0)
    return

const file = files[0]
os.log(file)
return bytes.toBase64Url(file.data);