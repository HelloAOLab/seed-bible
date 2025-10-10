const keysFirstAppearance = [
    { 
        key: "blueprint-ground", 
        chaptersInfo: {
            "25": MeshState.Shown, 
            "26": MeshState.Shown, 
            "35": MeshState.Shown, 
            "36": MeshState.Shown, 
            "37": MeshState.Shown 
        } 
    },
    { 
        key: "blueprint-walls", 
        chaptersInfo: {
            "25": MeshState.Shown, 
            "35": MeshState.Shown, 
        } 
    },
    { 
        key: "blueprint-ark-of-covenant",
        chaptersInfo: { 
            "35": MeshState.Shown, 
            "36": MeshState.Shown,
        }
    },
    { 
        key: "blueprint-pillars", 
        chaptersInfo: {
            "25": MeshState.Shown, 
            "35": MeshState.Shown, 
        }
    },
    { 
        key: "blueprint-incense-altar", 
        chaptersInfo: {
            "25": MeshState.Shown, 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "35": MeshState.Shown, 
            "36": MeshState.Shown,
        } 
    },
    { 
        key: "blueprint-menorah", 
        chaptersInfo: {
            "35": MeshState.Shown, 
            "36": MeshState.Shown, 
        } 
    },
    { 
        key: "blueprint-table-showbread", 
        chaptersInfo: {
            "35": MeshState.Shown, 
            "36": MeshState.Shown, 
        } 
    },
    { 
        key: "blueprint-bronze-laver", 
        chaptersInfo: { 
            "25": MeshState.Shown, 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "35": MeshState.Shown, 
            "36": MeshState.Shown, 
            "37": MeshState.Shown 
        } 
    },
    { 
        key: "blueprint-altar-of-sacrifice", 
        chaptersInfo: { 
            "25": MeshState.Shown,
            "26": MeshState.Shown,
            "35": MeshState.Shown,
            "36": MeshState.Shown,
            "37": MeshState.Shown
        } 
    },
    { 
        key: "ark-of-covenant", 
        chaptersInfo: { 
            "25": MeshState.Shown, 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Shown, 
            "37": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        } 
    },
    { 
        key: "incense-altar", 
        chaptersInfo: {
            "30": MeshState.Shown, 
            "37": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "menorah", 
        chaptersInfo: { 
            "25": MeshState.Shown, 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Shown, 
            "37": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "table-showbread", 
        chaptersInfo: { 
            "25": MeshState.Shown, 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Shown, 
            "37": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "structure-inner-curtain", 
        chaptersInfo: { 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Translucent, 
            "36": MeshState.Shown, 
            "37": MeshState.Translucent, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "structure-front-curtain", 
        chaptersInfo: { 
            "26": MeshState.Shown,
            "27": MeshState.Shown,
            "28": MeshState.Shown,
            "29": MeshState.Shown, 
            "30": MeshState.Translucent, 
            "36": MeshState.Shown, 
            "37": MeshState.Translucent, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "structure-front-pillars", 
        chaptersInfo: { 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Hidden, 
            "36": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
        },
    { 
        key: "structure-inner-pillars", 
        chaptersInfo: { 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Hidden, 
            "36": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
        },
    { 
        key: "structure-walls", 
        chaptersInfo: { 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Hidden, 
            "36": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "structure-bars", 
        chaptersInfo: { 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Hidden, 
            "36": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "structure-rings", 
        chaptersInfo: { 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Hidden, 
            "36": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "altar-of-sacrifice", 
        chaptersInfo: { 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        } 
    },
    { 
        key: "bronze-laver", 
        chaptersInfo: { 
            "30": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "cloth-purple", 
        chaptersInfo: { 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Hidden, 
            "36": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "cloth-brown", 
        chaptersInfo: { 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Hidden, 
            "36": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "cloth-red", 
        chaptersInfo: { 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Hidden, 
            "36": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "cloth-grey", 
        chaptersInfo: { 
            "26": MeshState.Shown, 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Hidden, 
            "36": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        }
    },
    { 
        key: "ground", 
        chaptersInfo: { 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        } 
    },
    { 
        key: "fence", 
        chaptersInfo: { 
            "27": MeshState.Shown, 
            "28": MeshState.Shown, 
            "29": MeshState.Shown, 
            "30": MeshState.Shown, 
            "38": MeshState.Shown, 
            "39": MeshState.Shown, 
            "40": MeshState.Shown 
        } 
    }
]

thisBot.FixBotsPosition();

const isValidChapter = thisBot.vars.currentChapter != null && !isNaN(Number(thisBot.vars.currentChapter));

if (thisBot.vars.currentBook && isValidChapter) {
    const shouldShow = thisBot.vars.currentBook === "Exodus" && thisBot.vars.currentChapter >= 25;
    thisBot.SetBotsVisibility({
        data: keysFirstAppearance.map((info ,index) => {
            return { 
                key: info.key, 
                value: shouldShow ? (info.chaptersInfo[String(thisBot.vars.currentChapter)] ?? MeshState.Hidden) : MeshState.Hidden,
                index
            }
        })
    })
}