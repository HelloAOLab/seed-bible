const getTools = () => {
    return [
        [
            {
                "type": "function",
                "name": "getTime",
                "description": "Get the current time",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "type": "function",
                "name": "analyzeScreen",
                "description": "Capture the user's screen and analyze what is visible in it. or if user asks about explanation about something on screen",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "userSpecification": {
                            "type": "string",
                            "description": "Extra instructions from the user about what to focus on in the analysis of the pageContainer"
                        }
                    },
                    "required": [
                        "userSpecification"
                    ]
                }
            },
            {
                "type": "function",
                "name": "openChapter",
                "description": `Opens a chapter in bible`,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "bookId": {
                            "type": "string",
                            "description": "book id"
                        },
                        "chapter": {
                            "type": "string",
                            "description": "chapter number"
                        }
                    },
                    "required": [
                        "bookId",
                        "chapter"
                    ]
                }
            }
        ]
    ]
}