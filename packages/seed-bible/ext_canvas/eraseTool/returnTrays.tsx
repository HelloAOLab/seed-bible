const Trays = getBots('system',"Tray.manager")
const dim = os.getCurrentDimension()
for(const element of Trays){
    element.tags[dim+'Z'] = 0
    element.tags.pointable = true

}