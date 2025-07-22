let geoJson;
console.log(that)
if(that.place.place === that.place.geojson){
    geoJson = await web.get(`https://raw.githubusercontent.com/Bored-Wizard/isreal_geojson/main/${that.place.geojson}.geojson`);
}else{
    geoJson = await web.get(`https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/geometry/${that.place.geojson}.geojson`);
}
if(geoJson.status === 200){
    whisper(getBot('system', 'ext_geoImporter.importer'), "loadMap", {file: geoJson.data, loadGame: that?.loadGame ? true : false})
}else{
    os.toast("Something went wrong while retrieving the data");
}