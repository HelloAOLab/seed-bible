const { files } = that;
const file = files[0];
const reader = new FileReader();
// os.log('runwe')
// Example: read text files
reader.onload = (event) => {
  const fileContent = event.target.result;

  // console.log(`Content of ${file.name}:`, fileContent);
  if (JSON.parse(fileContent)) {
    const data = JSON.parse(fileContent);
    // console.log(data,'1')
    if (data.metadata.validPackageJson) {
      thisBot.readPackageJson({ data });
    }
  }
  // You can parse JSON, split CSV, etc. here
};

reader.onerror = (error) => {
  console.error("Error reading file:", error);
};

reader.readAsText(file);
