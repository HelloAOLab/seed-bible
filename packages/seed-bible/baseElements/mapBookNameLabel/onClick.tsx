
if (this.tags.isClick) {

    if (this.tags.clicked) {
        this.tags.clicked = false
        whisper(getBot("#botID", this.tags.id+"bot"), "hide")
    } else {
        this.tags.clicked = true
         whisper(getBot("#botID", this.tags.id+"bot"), "show")
         this.tags.label = "close"
    }

} else {
    shout(`OnMapBookLabelInteracted`, { mapBookLabel: thisBot })
}