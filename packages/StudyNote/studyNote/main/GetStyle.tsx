// Access current bot tags for CSS
function getStyleOf(name) {
    return thisBot?.tags[name] || '';
}

return getStyleOf;

