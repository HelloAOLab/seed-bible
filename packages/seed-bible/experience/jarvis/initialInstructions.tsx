await os.sleep(1000)

const bookNames = [...Object.values(globalThis.BookNames)]

const messages = [
    { role: "system", content: `You are a helpful assistant bot. Use the supplied tools to assist the user.

                                Right now you are an assistant in a 3D world called bible canvas.

                                Your name is AO.

                                If I ask you anythink about canvas then please reply that canvas is an interactive and educational tool build for the purpose of helping people understand the holy bible.

                                your messages should be always be brief and friendly

                                If the user ask where he is right now or what he is seeing then tell him he is seeing the Canvas as tell him what a canvas is.

                                you are right now an entity in a 3D world and are able to hear user as whatever they are saying is being transcribed and sent to you.

                                if the user asks what you can do then take few tools and describe them briefly
                                ` 
    }
]

const aiTools = [
    {
        type: "function",
        function: {
            name: "changeLightMode",
            description: "Changes the display theme between light and dark mode based on user preferences",
            parameters: {
                type: "object",
                properties: {
                    mode: {
                        type: "string",
                        description: "the theme user wants. it can only either be dark or light."
                    }
                },
                required: ["mode"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createBibleStack",
            description: "if user ask to create bible or create bible stack then run this function",
            parameters: {
                type: "object",
                properties: {},
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "spawnTestament",
            description: "if user ask to pick or spawn a testament from bible then run this function",
            parameters: {
                type: "object",
                properties: {
                    testament: {
                        type: "string",
                        enum: ["New Testament", "Old Testament"],
                        description: "the testament that the user describes to be taken out from bible",
                    }
                },
                required: ["testament"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "spawnSection",
            description: "if user ask to pick or spawn a section from bible then run this function",
            parameters: {
                type: "object",
                properties: {
                    section: {
                        type: "string",
                        enum: ["prophecy", "letters", "history", "gospels","prophets", "wisdom", "law", "writings", "torah"],
                        description: "the section that the user describes to be taken out from bible",
                    }
                },
                required: ["section"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "spawnBook",
            description: "if user ask to pick out a book or spawn a book from bible or take out a book from bible. if the book mentioned by user should be present in bible or else don't run this function",
            parameters: {
                type: "object",
                properties: {
                    bookName: {
                        type: "string",
                        description: "whatever book the user mentions to take out from bible",
                        enum: [...bookNames]
                    }
                },
                required: ["bookName"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "spawnChapter",
            description: "if user ask to spawn a chapter from a book in bible. if the book mentioned by user should be present in bible or else don't run this function",
            parameters: {
                type: "object",
                properties: {
                    bookName: {
                        type: "string",
                        description: "the book the user mentions for the chapter to be spawned from",
                        enum: [...bookNames]
                    },
                    chapterNumber: {
                        type: "number",
                        description: "the chapter number the user mentions to be spawned"
                    }
                },
                required: ["bookName", "chapterNumber"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "pickChapter",
            description: "if user ask to pick out or take out a chapter from a book in bible. if the book mentioned by user should be present in bible or else don't run this function",
            parameters: {
                type: "object",
                properties: {
                    bookName: {
                        type: "string",
                        description: "the book the user mentions for the chapter to be picked from",
                        enum: [...bookNames]
                    },
                    chapterNumber: {
                        type: "number",
                        description: "the chapter number the user mentions to be picked"
                    }
                },
                required: ["bookName", "chapterNumber"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "pickChapterWithoutBookName",
            description: "if user ask to pick out or take out a chapter without specifying a book",
            parameters: {
                type: "object",
                properties: {
                    chapterNumber: {
                        type: "number",
                        description: "the chapter number the user mentions to be picked"
                    }
                },
                required: ["chapterNumber"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createImage",
            description: "if user ask to create an image or picture of anything in anyway then run this function",
            parameters: {
                type: "object",
                properties: {
                    userRequirements: {
                        type: "string",
                        description: "userRequirement parameter is the requirement of the user for the desired image or picture"
                    }
                },
                required: ["userRequirements"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "clearCanvas",
            description: "if user ask to clean or remove everything from the canvas then this function should be called",
            parameters: {
                type: "object",
                properties: {},
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createAnimation",
            description: "if user ask to clean or remove everything from the canvas then this function should be called",
            parameters: {
                type: "object",
                properties: {
                    x: {
                        type: "number",
                        description: "when the createAnimation function is run it created a bot. the parameter x will be the width of the created bot and it's value should be randomized between 1 and 20"
                    },
                    y: {
                        type: "number",
                        description: "when the createAnimation function is run it created a bot. the parameter y will be the length of the created bot and it's value should be randomized between 1 and 20"
                    },
                    z: {
                        type: "number",
                        description: "when the createAnimation function is run it created a bot. the parameter z will be the height of the created bot and it's value should be randomized between 1 and 20"
                    },
                    animationFrame: {
                        type: "object",
                        description: `animationFrame will contained custom animation frame
                                    [{"x":5,"y":5,"z":5,"easing":"linear","scale":1,"rotations":0,"rotationAxis":"X","animation":null,"duration":1,"type":"animation","rX":1,"rY":1,"rZ":1,"initPos":{"x":-2,"y":-12,"z":0,"scale":1,"rX":0,"rY":0,"rZ":0}},{"x":0,"y":0,"z":0,"easing":"linear","scale":1,"rotations":0,"rotationAxis":"X","duration":1,"animation":null,"type":"animation","rX":0,"rY":0,"rZ":0,"initPos":{"x":3,"y":-7,"z":5,"scale":1,"rX":1,"rY":1,"rZ":1}}]

                                    this is a custom animationFrame config where x, y, x are directional vectors and rX, rY, rZ are rotational vectors. the initPos x, y, x, rX, rY, rZ are always the sum of the previous initPos's x, y, z, rX, rY and rZ with x, y, z, rX, rY and rZ. If a user tells you to create a animation then the animation frame of parameters should look like this with initPos x, y, x as 0,0,0

                                    [{"x":5,"y":0,"z":5,"easing":"cubic","scale":1,"rotations":0,"rotationAxis":"X","animation":null,"duration":1,"type":"animation","rX":0,"rY":0,"rZ":0,"initPos":{"x":3,"y":-16,"z":0,"scale":1,"rX":0,"rY":0,"rZ":0}},{"x":5,"y":0,"z":-5,"easing":"cubic","scale":1,"rotations":0,"rotationAxis":"X","duration":1,"animation":null,"type":"animation","rX":0,"rY":0,"rZ":0,"initPos":{"x":8,"y":-16,"z":5,"scale":1,"rX":0,"rY":0,"rZ":0}},{"x":5,"y":0,"z":5,"easing":"linear","scale":1,"rotations":0,"rotationAxis":"X","duration":1,"animation":null,"type":"animation","rX":0,"rY":0,"rZ":0,"initPos":{"x":13,"y":-16,"z":0,"scale":1,"rX":0,"rY":0,"rZ":0}},{"x":5,"y":0,"z":-5,"easing":"linear","scale":1,"rotations":0,"rotationAxis":"X","duration":1,"animation":null,"type":"animation","rX":0,"rY":0,"rZ":0,"initPos":{"x":18,"y":-16,"z":5,"scale":1,"rX":0,"rY":0,"rZ":0}}]
                                    this is a custom animation where bot is jumping in the right direction and it jumps two time in this animation. Also consider this data when creating animationFrame
                                    `
                    }
                },
                required: ["x", "y", "z", "animationFrame"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "navigateToLobby",
            description: "if user ask to go to lobby or start a lobby or ask to take him to the lobby or navigate to lobby then this function should run",
            parameters: {
                type: "object",
                properties: {},
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "locatePlace",
            description: "this function serches a local bible location repositories and shows the location to the user on a map",
            parameters: {
                type: "object",
                properties: {
                    locationName: {
                        type: "string",
                        description: "Location that the user has specified to search"
                    }
                },
                required: ["locationName"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "closeMap",
            description: "it closes the map in which the location are shown and takes you back to home",
            parameters: {
                type: "object",
                properties: {
                },
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "loadChaism",
            description: "if the user says to load chaism",
            parameters: {
                type: "object",
                properties: {
                },
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "closeChaism",
            description: "if the user says to close chaism",
            parameters: {
                type: "object",
                properties: {
                },
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "openPage",
            description: "if the user says to open page or bible pages then run this function",
            parameters: {
                type: "object",
                properties: {
                },
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "closePage",
            description: "if the user says to close page or bible pages then run this function",
            parameters: {
                type: "object",
                properties: {
                },
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createNewTab",
            description: "if the user says to open a new tab of the bible books",
            parameters: {
                type: "object",
                properties: {
                },
                required: [],
                additionalProperties: false
            }
        }
    },
     {
        type: "function",
        function: {
            name: "createAiTab",
            description: "if the user says to open a new tab of a generated content about anything in the bible ",
            parameters: {
                type: "object",
                properties: {
                    data: {
                        type: "string",
                        description: "the data that the user asked about!"
                    },
                },
                required: ["data"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "openBook",
            description: "opens the page with the chapter and book mentioned by the user",
            parameters: {
                type: "object",
                properties: {
                    chapterNumber: {
                        type: "number",
                        description: "the chapter mentioned by the user it have to be a number"
                    },
                    bookName: {
                        type: "string",
                        description: "the book mentioned by the user, it should be a book in bible"
                    }
                },
                required: ["chapterNumber",'bookName'],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "launchHouseChurch",
            description: "if the user says to start or launch the house church then run this function",
            parameters: {
                type: "object",
                properties: {
                },
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "showSermonNetwork",
            description: "if the user ask to be shown the sermon network by pastor tom then run this function but if he has not yet launched the house church then do not run this function",
            parameters: {
                type: "object",
                properties: {
                },
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "showHouseChurchStats",
            description: "if the user ask to be shown the house church stats then run this function but if he has not yet launched the house church then do not run this function",
            parameters: {
                type: "object",
                properties: {
                },
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "hideHouseChurchStats",
            description: "if the user ask to hide the house church stats or close the house church stats then run this function but if he has not yet launched the house church then do not run this function",
            parameters: {
                type: "object",
                properties: {
                },
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "StartCutscene",
            description: "if the user ask start the house church cut scene run this function but if he has not yet launched the house church then do not run this function",
            parameters: {
                type: "object",
                properties: {
                },
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "closeHouseChurch",
            description: "if the user ask close the house church run this function but if he has not yet launched the house church then do not run this function",
            parameters: {
                type: "object",
                properties: {
                },
                required: [],
                additionalProperties: false
            }
        }
    }
];

globalThis.preAIInstructions = [...messages];

globalThis.aiTools = [...aiTools];

// const responseStructureInstructions = [
//     {
//         "role": "system",
//         "content": `Right now you are an assistant in a 3D world called bible canvas.

//                     you will only respond or reply in JSON format.

//                     the format of the JSON will be
//                     {
//                         "message": "your text response",
//                         functions: [
//                             { "functionName": "", "parameters": {}}
//                         ]
//                     }

//                     if the user doesn't ask to do anything then keep the functions object as an empty array.

//                     the message object should never be empty.
//                     `
//     },
// ]

// const aiResponseInstruction = [
//     {
//         "role": "system",
//         "content": `
//                 you will behave as an assistant in the 3D world of bible canvas.

//                 If I ask you anythink about canvas then please reply that canvas is an interactive and educational tool build for the purpose of helping people understand the holy bible.

//                 your messages should be always be friendly

//                 If the user ask where he is right now or what he is seeing then tell him he is seeing the Canvas as tell him what a canvas is.

//                 you are right now an entity in a 3D world and are able to hear user as whatever they are saying is being transcribed and sent to you.
//                 `
//     }
// ]

// const aiFunctionDescription = [
//     {
//         "role": "system",
//         "content": `if user ask to pick out a chapter from a book in bible then add an object in the functions array which should be the following

//                     { 
//                         "functionName": "pickChapter", 
//                         "parameters": {
//                             bookName: {
//                                 type: "string",
//                                 description: "the book the user mentions for the chapter to be picked from"
//                             },
//                             chapterNumber: {
//                                 type: "number",
//                                 description: "the chapter number the user mentions to be picked"
//                             }
//                         }
//                     }

//                     if the user mentions chapter and a book then the function name should always be pickChapters and the parameter should always be bookName and chapterNumber

//                     if user mentions a book that doesn't exist in bible then the functions object should not have the above function and the reponse should be that the book is not in bible.
//                     `
//     },
//     {
//         "role": "system",
//         "content": `if user ask to pick out a book from bible or take out a book from bible then your response should be like this where the book names should be the names of book in bible.

//                     the functions that should be added to the functions array should be the following
//                     {
//                         "functionName": "pickBook", 
//                         "parameters": { bookNames: {
//                             type: "array",
//                             description: "bookNames parameter is an array of strings which is the book names mentioned by the user"
//                         } }
//                     }

//                     if the user mentions a book that is not in the bible then don't add it to the bookNames parameter and point out those books names to user

//                     if all the books mentioned by the user are not in bible then the function should not be added to the array.
//                     `
//     },
//     {
//         "role": "system",
//         "content": `if user ask to create an image or picture of anything in anyway then the following function should be added to the functions array
//                         {
//                             "functionName": "createImage", 
//                             "parameters": {
//                                 userRequirements: {
//                                     type: "string",
//                                     description: "userRequirement parameter is the requirement of the user for the desired image or picture"
//                                 }
//                             }
//                         }
                    
//                     as it will take time for the image to be generated the response should always be like that you are working on to create it
//                     `
//     },
//     {
//         "role": "system",
//         "content": `if user ask to change display mode between light or dark then the following should be added to functions array
//                         { 
//                             "functionName": "changeLightMode",
//                             "parameters": { mode: {
//                                 type: "string",
//                                 description: "the value of mode can only either be dark or light based on the user response"
//                             } }
//                         }
//                     `
//     },
//     {
//         "role": "system",
//         "content": `if user ask to create bible or create bible stack then the following function should be added to the functions array 
                     
//                         "functionName": "createBibleStack",
//                         "parameters": {
//                             type: "empty object",
//                             description: "for createBibleStack function the parameters will always be an empty object"
//                         }
//                     }
//                     `
//     },
//     {
//         "role": "system",
//         "content": `if user ask to clean or remove everything from the canvas then the following function should be added to the functions array 
//                         {
//                             "functionName": "clearCanvas", 
//                             "parameters": {
//                                 type: "empty object",
//                                 description: "for clearCanvas function the parameters will always be an empty object"
//                             }
//                         }
//                     `
//     },
//     {
//         "role": "system",
//         "content": `if user ask to create a animation then the following function should be added to the functions array
//                     { 
//                         "functionName": "createAnimation",
//                         "parameters": {
//                             x: {
//                                 type: "number",
//                                 description: "when the create animation function is run it created a bot. the parameter x will be the width of the created bot and it's value should be randomized between 1 and 20"
//                             },
//                             y: {
//                                 type: "number",
//                                 description: "when the create animation function is run it created a bot. the parameter y will be the length of the created bot and it's value should be randomized between 1 and 20"
//                             },
//                             z: {
//                                 type: "number",
//                                 description: "when the create animation function is run it created a bot. the parameter z will be the height of the created bot and it's value should be randomized between 1 and 20"
//                             },
//                             animationFrame: [
//                                 type: "array",
//                                 description: "animation frames will contained custom animation frame details that will be mentioned later in the message"
//                             ] 
//                             }
//                         }
//                     `
//     },
//     {
//         "role": "system",
//         "content": `[{"x":5,"y":5,"z":5,"easing":"linear","scale":1,"rotations":0,"rotationAxis":"X","animation":null,"duration":1,"type":"animation","rX":1,"rY":1,"rZ":1,"initPos":{"x":-2,"y":-12,"z":0,"scale":1,"rX":0,"rY":0,"rZ":0}},{"x":0,"y":0,"z":0,"easing":"linear","scale":1,"rotations":0,"rotationAxis":"X","duration":1,"animation":null,"type":"animation","rX":0,"rY":0,"rZ":0,"initPos":{"x":3,"y":-7,"z":5,"scale":1,"rX":1,"rY":1,"rZ":1}}]

//                     this is a custom animationFrame config where x, y, x are directional vectors and rX, rY, rZ are rotational vectors. the initPos x, y, x, rX, rY, rZ are always the sum of the previous initPos's x, y, z, rX, rY and rZ with x, y, z, rX, rY and rZ. If a user tells you to create a animation then the animation frame of parameters should look like this with initPos x, y, x as 0,0,0`
//     },
//     {
//         "role": "system",
//         "content": `[{"x":5,"y":0,"z":5,"easing":"cubic","scale":1,"rotations":0,"rotationAxis":"X","animation":null,"duration":1,"type":"animation","rX":0,"rY":0,"rZ":0,"initPos":{"x":3,"y":-16,"z":0,"scale":1,"rX":0,"rY":0,"rZ":0}},{"x":5,"y":0,"z":-5,"easing":"cubic","scale":1,"rotations":0,"rotationAxis":"X","duration":1,"animation":null,"type":"animation","rX":0,"rY":0,"rZ":0,"initPos":{"x":8,"y":-16,"z":5,"scale":1,"rX":0,"rY":0,"rZ":0}},{"x":5,"y":0,"z":5,"easing":"linear","scale":1,"rotations":0,"rotationAxis":"X","duration":1,"animation":null,"type":"animation","rX":0,"rY":0,"rZ":0,"initPos":{"x":13,"y":-16,"z":0,"scale":1,"rX":0,"rY":0,"rZ":0}},{"x":5,"y":0,"z":-5,"easing":"linear","scale":1,"rotations":0,"rotationAxis":"X","duration":1,"animation":null,"type":"animation","rX":0,"rY":0,"rZ":0,"initPos":{"x":18,"y":-16,"z":5,"scale":1,"rX":0,"rY":0,"rZ":0}}]
//                     this is a custom animation where bot is jumping in the right direction and it jumps two time in this animation. Also consider this data when creating animationFrame
//         `
//     },
//     {
//         "role": "system",
//         "content": `if user ask to go to lobby or start a lobby or ask to take him to the lobby or navigate to lobby then the following function should be added to the functions array 
//                         {
//                              "functionName": "navigateToLobby", 
//                              "parameters": {
//                                 type: "empty object",
//                                 description: "for navigateToLobby function the parameters will always be an empty object"
//                              }
//                         }
                    
//                     `
//     },
// ]

// const aiFunctionsSubDescription = [
//     {
//         role: "system",
//         content: `
//             the only function names that are available are pickChapter, pickBook, createImage, changeLightMode, createBibleStack, clearCanvas, createAnimation or navigateToLobby. 

//             do not make any custom function names

//             if the user does not tell you to do anything related to the functions described then the functions array should always be empty.

//             the functionNames object should never be changed and should remain as it as written in the above text

//             if the user ask what you can do then remember the functions described above and tell the user in brief what you can do while only selecting a few functionality

//             you should never create custom functions to be added to the function array. You should just add the function object described above.
//         `
//     }
// ]