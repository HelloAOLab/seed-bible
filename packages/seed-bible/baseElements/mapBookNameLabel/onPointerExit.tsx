const MM = getBot("#system", "managers.MapsManager")
const mapData = MM.GetMapDataById({mapId: thisBot.tags.mapId})
if (this.tags.isHover && !this.tags.hidden) {

    this.tags.label = mapData.isDatesEnabled == 2 ? this.tags.old : this.tags.present + " yrs ago"
    if (this.tags.clicked) {
        this.tags.label = "close"
    }
}