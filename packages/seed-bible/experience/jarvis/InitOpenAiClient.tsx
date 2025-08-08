if(!globalThis?.openAIClient){
    const  key = await os.showInput(null, {placeholder: "Enter OpenAI api key"});
    if(key && key !== ""){
        console.log('changed')
        
    }else{
        console.log( false)
    }
}