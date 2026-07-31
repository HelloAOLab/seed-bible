masks["run"] = false;
shout("returnTrays");
let tm = setTimeout(() => {
  destroy(thisBot);
}, 10000);

setTagMask(thisBot, "tm", tm, "tempLocal");
