function handleResourceHeader({ setIsModalOpen }) {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.justifyContent = "space-between";
  wrapper.style.alignItems = "center";

  const label = document.createElement("span");
  label.textContent = "Schedule";

  const addButton = document.createElement("button");
  addButton.textContent = "+";
  addButton.style.marginLeft = "8px";
  addButton.style.fontSize = "8px";
  addButton.style.paddin = "0 0";

  addButton.title = "Add New Group";
  addButton.style.cursor = "pointer";

  addButton.onclick = () => {
    setIsModalOpen(true);
  };

  wrapper.appendChild(label);
  wrapper.appendChild(addButton);
  return { domNodes: [wrapper] };
}
return handleResourceHeader;
