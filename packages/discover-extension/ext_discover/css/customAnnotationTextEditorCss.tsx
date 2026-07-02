export function getCustomAnnotationTextEditorCss(minH: number) {
  return `
.sre-root { width: 100%; position: relative; }
.sre-video-root {
  min-height: 500px;
}
.sre-hashtag-hint {
    font-size: 14px;
    background: #ededed;
    padding: 8px 6px;
    border-radius: 8px;
    margin: 8px 0;
    color: #570000;
}

.sre-preview-btn {
  border: none;
  outline: none;
  cursor: pointer;
  background: transparent;
  border-bottom: 2px solid transparent;
}
.sre-preview-btn.active {
  border-bottom: 2px solid #D36433;
}

.sre-editor {
  min-height: ${minH}px;
  outline: none;
  line-height: 1.6;
  font-size: 16px;
  background: #fff;
  border: 1px solid #e6e6e6;
  border-top: none;
  border-radius: 0 0 8px 8px;
}

.sre-editor * {
  color: initial !important;
}
  .sre-loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--spaceSelection);
    border-top: 2px solid #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
.sre-toolbar {
  width: 100%;
  background: var(--themeSideMenu, #f7f7f9);
  display: flex; align-items: center; justify-content: flex-start;
  padding: 8px 10px; gap: 12px; position: relative; overflow: visible; flex-wrap: nowrap;
  border: 1px solid #e6e6e6; border-bottom: none; border-radius: 8px 8px 0 0;
}
.sre-ib {
  background: transparent; border: none; cursor: pointer; padding: 6px; border-radius: 6px;
}
.sre-ib:hover { background: rgba(0,0,0,0.06); }
.sre-inline { display: inline-flex; align-items: center; gap: 6px; padding: 2px 4px; }
.sre-color { background: var(--themeSideMenu); width: 26px; height: 26px; border: none; border-radius: 50%; padding: 0; }
.sre-select { background: var(--themeSideMenu); height: 30px; border: 1px solid #ccc; border-radius: 6px; font-size: 12px; padding: 0 6px; }
.sre-number { background: var(--themeSideMenu); width: 64px; height: 28px; border: 1px solid #ccc; border-radius: 6px; padding: 0 6px; }
.sre-drop { position: relative; }
.sre-drop-menu {
  display: none; position: absolute; top: 100%; left: 0; background: var(--themeSideMenu); border: 1px solid #ddd;
  border-radius: 8px; padding: 6px; box-shadow: 0 6px 20px rgba(0,0,0,0.12); z-index: 10;
}
.sre-drop:hover .sre-drop-menu {  width: max-content; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.sre-measurer {
  position: absolute; left: -9999px; top: 0; visibility: hidden;
  display: flex; gap: 12px; align-items: center; height: 0; padding: 0;
}
.sre-item-measurer { display: inline-flex; align-items: center; }
.sre-item { display: inline-flex; align-items: center; flex-shrink: 0; }

.sre-overflow-btn { background: transparent; border: none; cursor: pointer; border-radius: 6px; padding: 6px; }
.sre-overflow-btn:hover { background: rgba(0,0,0,0.06); }

/* Auto-width overflow tray */
.sre-overflow-tray {
  width: 100%;
  display: flex;           /* FLEX for auto width */
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #eee;
  border-top: none;
  background: var(--themeSideMenu);
  border-radius: 0 0 8px 8px;
  margin-top: -8px;        /* tuck under toolbar edge slightly */
}
.sre-overflow-item {
  display: inline-flex; align-items: center; justify-content: flex-start;
  padding: 4px 6px; background: var(--themeSideMenu); border: 1px solid #eaeaea; border-radius: 6px;
  white-space: nowrap;
}
.sre-overflow-empty { color: #777; font-size: 12px; padding: 6px 2px; }

/* tuning modal */
.sre-tune-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.sre-tune-modal {
  width: min(720px, 90vw); max-height: 80vh; overflow: hidden; background: var(--themeSideMenu); border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  display: flex; flex-direction: column;
}
.sre-tune-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #eee; font-weight: 600; }
.sre-tune-close { margin-left: auto; border: none; background: transparent; cursor: pointer; }
.sre-tune-body { padding: 10px 16px; overflow: auto; max-height: 60vh; }
.sre-tune-row { display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 8px; }
.sre-tune-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px; color: #444; background: #f7f7f7; padding: 4px 6px; border-radius: 6px;
}
.sre-tune-arrows button { border: 1px solid #ddd; background: var(--pageBackground); cursor: pointer; border-radius: 6px; padding: 2px 4px; margin-left: 4px; }
.sre-tune-footer { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-top: 1px solid #eee; }
.sre-btn-primary { background: var(--secondaryColor); color: var(--pageTextColor); border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
.sre-btn-secondary { background: #efefef; color: #333; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer; }

@media (max-width: 768px) {
  .sre-toolbar { gap: 8px; padding: 6px 8px; }
  .sre-number { width: 56px; }
}
@media (max-width: 480px) {
  .sre-number { width: 50px; }
}

.ProseMirror {
  min-height: 100px;
  outline: none;
  caret-color: black;
}
.ProseMirror:focus {
  outline: none;
}
.sre-image {
  max-width: 100%;
  height: auto;
}

.relative-float {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    backgroundColor: rgba(0, 0, 0, 0.5);
    zIndex: 10000;
    display: flex;
    alignItems: center;
    justifyContent: center;
    backdropFilter: blur(2px);
}

.command-box.relative-float {
    background-color: rgb(247, 247, 247);
    backdrop-filter: none;
    display: flex;
    flex-direction: column;
    top: 4rem;
    left: 2rem;
    height: max-content;
    width: 10rem;
    z-index: 99;
    padding: 10px;
    border-radius: 10px;
    box-shadow: 0px 1px 4px 0px #0000001A;
}
.command-box-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  cursor: pointer;
  font-family: DM Sans;
  font-weight: 500;
  font-style: Medium;
  font-size: 12px;
  leading-trim: NONE;
  line-height: 100%;
  letter-spacing: 0%;
}


.command-box-option img {
  width: 16px;
  cursor: pointer;
  height: 16px;
}

.playlist-wrapper-sre {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e2e2e2;
  background-color: var(--pageBackground);
  width: max-content;
  border-radius: 1rem;
}  

.playlist-container-sre {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
}

span.playlist-icon-sre {
  padding: 0.5rem;
  border-radius: 0.5rem;
  background-color: var(--themeSideMenu);
  color: var(--pageTextColor) !important;
  font-size: 12px;
  text-transform: uppercase;
}

span.playlist-label-sre {
  font-family: DM Sans;
  font-weight: 500;
  font-style: Medium;
  font-size: 12px;
  line-height: 100%;
  letter-spacing: 0%;
  color: var(--pageTextColor) !important;
}

.sre-ib-inverse {
    filter: var(--filter-mode);
}

.margin-negative-sre {
  margin-top: -7px;
}

.sre-play-circle {
  color: var(--secondaryColor) !important;
  font-size: 1.5rem;
}
`;
}
