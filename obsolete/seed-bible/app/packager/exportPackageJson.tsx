const { name, content, packageName, runAt } = that;
// Try to parse if it's a string
if (typeof data === "string") {
  try {
    content = JSON.parse(data); // check if it's valid JSON
  } catch (e) {
    content = { text: data }; // fallback: plain text
  }
} else if (typeof data === "object" && data !== null) {
  content = data; // already a JSON object
} else {
  content = { text: String(data) }; // fallback for numbers, etc.
}

const finalJson = {
  payload: {
    content: content,
  },
  metadata: {
    createdFor: packageName,
    runAt,
    validPackageJson: true,
    type: typeof content === "object" && !("text" in content) ? "json" : "text",
  },
};

os.download(finalJson, `${name || "exported_data"}.json`);
