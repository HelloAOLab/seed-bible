if (!masks["size"]) masks["size"] = 5;

if (masks["size"] === 10) masks["size"] = 5;
else if (masks["size"] === 5) masks["size"] = 3;
else if (masks["size"] === 3) masks["size"] = 10;

thisBot.tags["scaleX"] = masks["size"];
thisBot.tags["scaleY"] = masks["size"];
