let quizUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTCHSKTi8n4i085NJv6-yvWCpKkr_Zvmj9WYc5q2PGql1xzzqiMMDMOirsD2jPehoJal_OdMdg3hg2j/pub?gid=0&single=true&output=tsv"
let quizData = await web.get(quizUrl).then(e => {
    return e.data;
}).catch(e => {
    os.toast(e);
    return null;
})

function tsvJSON(tsv){

    var lines=tsv.split("\n");

    var result = [];

    var headers=lines[0].split("\t");
    for(let i = 0; i < headers.length; i++){
        headers[i] = headers[i].replace("\r", "")
    }

    for(var i=1;i<lines.length;i++){
        var obj = {};
        var currentline=lines[i].split("\t");
        for(var j=0;j<headers.length;j++){
            obj[headers[j]] = currentline[j].replace("\r", "");
        }
        result.push(obj);
    }

    //return result; //JavaScript object
    return result; //JSON
}

let QUIZJson;

if(quizData){
    try{
        QUIZJson = tsvJSON(quizData);
        for(let i = 0; i< QUIZJson.length; i++){
            QUIZJson[i]["options"] = [
                {
                    v: QUIZJson[i]["option1"]
                },
                {
                    v: QUIZJson[i]["option2"]
                },
                {
                    v: QUIZJson[i]["option3"]
                },
                {
                    v: QUIZJson[i]["option4"]
                }
            ];
            delete(QUIZJson[i]["option1"]);
            delete(QUIZJson[i]["option2"]);
            delete(QUIZJson[i]["option3"]);
            delete(QUIZJson[i]["option4"]);
        }
        return QUIZJson;
    }catch(e){
        os.toast(e);
        return e
    }
}else{
    return null;
}