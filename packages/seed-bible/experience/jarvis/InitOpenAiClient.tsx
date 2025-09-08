if(!globalThis?.openAIClient){
    let key = await os.showInput(null, {placeholder: "Enter OpenAI api key"});
    if(key && key !== ""){
        try{
            const client='';


            globalThis.openAIClient = client;
        }catch{() => {
            return false
        }}
        return true
    }else{
        return false
    }
}