let word = that.label.toString();
let base = 0;
let small = false;
for(const i in word) {
    switch(word[i]) {
        case "m":
        case "w":
        case "M":
        case "W":
            base += .55;
            break;

        case "l":
        case "i":
        case "I":
        case "!":
        case '"':
            base += .2;
            break;

        case "t":
        case "f":
        case "r":
            base += .3;
            break;
        case "' ":
        case ". ":
        case ", ":
        case ": ":
        case "; ":
        case "“ ":
        case "” ":
        case "’ ":
            base += .05;
            break;
        case "'":
        case ".":
        case ",":
        case ":":
        case ";":
        case "“":
        case "”":
        case "’":
            base += .15;
            small = true;
            break;
        
        default:
            base += .4;
            break;
    }
}
return ((word.length > 6 && !small) || (word.length > 8 && small)) ? base * .9 : base