HighlightWords({
    verse: 1,
    color: "#000", // text color
    backgroundColor: "#ffeb3b", // highlight color
    createAttributes: (book, chapter, verse) => {
        return {
            style: {
                background: "red"
            }
        }
    }
});