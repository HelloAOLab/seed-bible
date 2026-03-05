const items = [
  {
    icon: "locations",
    title: () => "Open Location",
    onClick: (item: any) => {
      console.log("item", item);
    },
    attributes: {
      onMouseEnter: (e: any) => {
        e.target.style.color = "#0D47A1";
        e.target.style.fontWeight = "400";
      },
      onMouseLeave: (e: any) => {
        setTimeout(() => {
          e.target.style.color = "";
          e.target.style.fontWeight = "";
          e.target.style.fontStyle = "";
        }, 2000);
      },
    },
  },
];

return items;
