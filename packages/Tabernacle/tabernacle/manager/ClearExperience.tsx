const keys = [
    "altar-of-sacrifice",
    "ark-of-covenant",
    "bronze-laver",
    "incense-altar",
    "menorah",
    "table-showbread",
    "cloth-brown",
    "cloth-red",
    "cloth-grey",
    "cloth-purple",
    "ground",
    "fence",
    "structure-front-pillars",
    "structure-inner-pillars",
    "structure-walls",
    "structure-rings",
    "structure-bars",
    "structure-inner-curtain",
    "structure-front-curtain",
]

// Development purposes
thisBot.SetBotsVisibility({data: keys.map((key) => { return {key, value: MeshState.Hidden} })});