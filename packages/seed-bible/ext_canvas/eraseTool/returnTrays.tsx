let Trays = getBots('system',"Tray.manager")
let dim = os.getCurrentDimension()
for(let element of Trays){
    element.tags[dim+'Z'] = 0
    element.tags.pointable = true

}