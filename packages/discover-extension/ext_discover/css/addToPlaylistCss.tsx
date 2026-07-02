export const addToPlaylistCss = `div.add-to-playlist-container,
div.add-to-playlist-container * div.add-to-playlist-container *::after,
div.add-to-playlist-container *::before {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  color: var(--verseTextColor, var(--text-verse-color, var(--pageTextColor)));
  font-family: "Satoshi";
}

div.add-to-playlist-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  background-color: var(--pageBackground);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow: auto;
}

.add-to-playlist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  margin-bottom: 1rem;
  font-size: 16px;
}

.add-to-playlist-header h1 {
  font-family: Satoshi;
  font-weight: 700;
  font-style: Bold;
  font-size: 16px;
  leading-trim: NONE;
  line-height: 100%;
  letter-spacing: 0%;
}

.add-to-playlist-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
`;
