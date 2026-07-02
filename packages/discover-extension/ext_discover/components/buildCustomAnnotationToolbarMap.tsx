import { clamp } from "ext_discover.hooks.customAnnotationTextEditorHtml";
import { COMMAND_ICON } from "ext_discover.models.customAnnotationTextEditor";

export function buildCustomAnnotationToolbarMap(ctx: any) {
  const {
    Cmds,
    textColor,
    setTextColor,
    bgColor,
    setBgColor,
    fontPx,
    setFontPx,
    lineSpacing,
    setLineSpacing,
    padY,
    setPadY,
    padX,
    setPadX,
    onPickImage,
    onPickJSON,
    onAddLink,
  } = ctx;

  const iconBtn = (
    title: any,
    icon: any,
    onClick: any,
    url = "",
    isInverse = false,
    marginNegative = false
  ) => (
    <button
      className={`sre-ib ${isInverse ? "sre-ib-inverse" : ""} ${marginNegative ? "margin-negative-sre" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      title={title}
    >
      {url ? (
        <img width={14} height={14} src={url} alt={title} />
      ) : (
        <span className="material-symbols-outlined">{icon}</span>
      )}
    </button>
  );

  const colorInput = (value: any, onChange: any) => (
    <input
      type="color"
      value={value}
      onChange={(e: any) => onChange(e.target?.value)}
      className="sre-color"
    />
  );

  const numberChip = (
    value: any,
    setValue: any,
    min: any,
    max: any,
    step: any,
    onApply: any
  ) => (
    <div className="sre-numchip">
      <button
        onClick={(e) => {
          e.preventDefault();
          const v = clamp((+value || 0) - step, min, max);
          setValue(v);
          onApply(v);
        }}
      >
        −
      </button>
      <div>{value}</div>
      <button
        onClick={(e) => {
          e.preventDefault();
          const v = clamp((+value || 0) + step, min, max);
          setValue(v);
          onApply(v);
        }}
      >
        +
      </button>
    </div>
  );

  const select = (options: any, value: any, onChange: any, title: any) => (
    <select
      className="sre-select"
      value={value}
      title={title}
      onChange={(e: any) => onChange(e.target?.value)}
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const alignDrop = (
    <div className="sre-drop">
      <button
        className="sre-ib"
        onClick={(e) => {
          e.preventDefault();
        }}
      >
        <span className="material-symbols-outlined">format_align_left</span>
      </button>
      <div className="sre-drop-menu">
        <button
          onClick={(e) => {
            e.preventDefault();
            Cmds.alignLeft(e);
          }}
        >
          <span className="material-symbols-outlined">format_align_left</span>
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            Cmds.alignCenter(e);
          }}
        >
          <span className="material-symbols-outlined">format_align_center</span>
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            Cmds.alignRight(e);
          }}
        >
          <span className="material-symbols-outlined">format_align_right</span>
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            Cmds.alignJustify(e);
          }}
        >
          <span className="material-symbols-outlined">
            format_align_justify
          </span>
        </button>
      </div>
    </div>
  );

  const listDrop = (
    <div className="sre-drop">
      <button className="sre-ib">
        <span className="material-symbols-outlined">format_list_bulleted</span>
      </button>
      <div className="sre-drop-menu">
        <button
          onClick={(e) => {
            e.preventDefault();
            Cmds.toggleBulletList(e);
          }}
        >
          <span className="material-symbols-outlined">
            format_list_bulleted
          </span>
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            Cmds.toggleOrderedList(e);
          }}
        >
          <span className="material-symbols-outlined">
            format_list_numbered
          </span>
        </button>
      </div>
    </div>
  );

  const paragraphDrop = (
    <select className="sre-select" title="Paragraph">
      <option
        onClick={(e) => {
          e.preventDefault();
          ctx.chain("setParagraph");
        }}
      >
        P
      </option>
      <option
        onClick={(e) => {
          e.preventDefault();
          ctx.chainArg("toggleHeading", { level: 1 });
        }}
      >
        H1
      </option>
      <option
        onClick={(e) => {
          e.preventDefault();
          ctx.chainArg("toggleHeading", { level: 2 });
        }}
      >
        H2
      </option>
      <option
        onClick={(e) => {
          e.preventDefault();
          ctx.chainArg("toggleHeading", { level: 3 });
        }}
      >
        H3
      </option>
    </select>
  );

  return {
    mic: iconBtn("Mic", "mic", Cmds.mic),
    video: iconBtn("Video", "video_camera_back_add", Cmds.video),
    slash: iconBtn("Command", null, Cmds.slash, COMMAND_ICON, true, true),
    bold: iconBtn("Bold", "format_bold", Cmds.bold),
    italic: iconBtn("Italic", "format_italic", Cmds.italic),
    underline: iconBtn("Underline", "format_underlined", Cmds.underline),
    strikethrough: iconBtn(
      "Strikethrough",
      "format_strikethrough",
      Cmds.strikethrough
    ),
    superscript: iconBtn("Superscript", "superscript", Cmds.superscript),
    subscript: iconBtn("Subscript", "subscript", Cmds.subscript),
    align: alignDrop,
    list: listDrop,
    "line-spacing": (
      <div className="sre-inline">
        <span className="material-symbols-outlined">format_line_spacing</span>
        <input
          className="sre-number"
          type="number"
          step="0.1"
          min="1"
          max="4"
          value={lineSpacing}
          onChange={(e: any) => {
            const v = clamp(parseFloat(e.target.value || "1.6"), 1, 4);
            setLineSpacing(v);
            Cmds.setLineHeight(v);
          }}
          title="Line spacing"
        />
      </div>
    ),
    "text-color": (
      <div className="sre-inline" title="Text color">
        <span className="material-symbols-outlined">title</span>
        {colorInput(textColor, (c: any) => Cmds.setTextColor(c))}
      </div>
    ),
    "bg-color": (
      <div className="sre-inline" title="Highlight color">
        <span className="material-symbols-outlined">border_color</span>
        {colorInput(bgColor, (c: any) => Cmds.setHighlightColor(c))}
      </div>
    ),
    paragraph: paragraphDrop,
    "font-family": (
      <select
        className="sre-select"
        title="Font family"
        onChange={(e: any) => Cmds.setFontFamily(e.target?.value)}
      >
        {[
          "DM Sans",
          "Arial",
          "Times New Roman",
          "Courier New",
          "Georgia",
          "Verdana",
        ].map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    ),
    "font-style": (
      <select
        className="sre-select"
        title="Font style"
        onChange={(e: any) => {
          const v = e.target.value;
          if (v === "bold") Cmds.bold();
          else if (v === "italic") Cmds.italic();
          else if (v === "light") Cmds.setFontFamily(""); // simple; devs can expand
        }}
      >
        <option value="normal">Normal</option>
        <option value="bold">Bold</option>
        <option value="italic">Italic</option>
        <option value="light">Light</option>
      </select>
    ),
    "font-size": (
      <div className="sre-inline" title="Font size">
        <span className="material-symbols-outlined">format_size</span>
        <input
          className="sre-number"
          type="number"
          min="8"
          max="72"
          step="1"
          value={fontPx}
          onChange={(e: any) => {
            const v = clamp(parseInt(e.target.value || "16", 10), 8, 72);
            setFontPx(v);
            Cmds.setFontSize(v);
          }}
        />
      </div>
    ),
    undo: iconBtn("Undo", "undo", Cmds.undo),
    redo: iconBtn("Redo", "redo", Cmds.redo),
    clear: iconBtn("Clear", "format_clear", Cmds.clear),
    print: iconBtn("Print", "print", Cmds.print),
    "margins-y": (
      <div className="sre-inline" title="Vertical padding">
        <span className="material-symbols-outlined">height</span>
        <input
          className="sre-number"
          type="number"
          min="0"
          max="200"
          value={padY}
          onChange={(e: any) => {
            const v = clamp(parseInt(e.target.value || "0", 10), 0, 200);
            setPadY(v);
          }}
        />
      </div>
    ),
    "margins-x": (
      <div className="sre-inline" title="Horizontal padding">
        <span className="material-symbols-outlined">width</span>
        <input
          className="sre-number"
          type="number"
          min="0"
          max="200"
          value={padX}
          onChange={(e: any) => {
            const v = clamp(parseInt(e.target.value || "0", 10), 0, 200);
            setPadX(v);
          }}
        />
      </div>
    ),
    link: iconBtn("Insert Link", "link", onAddLink),
    image: iconBtn("Insert Image", "image", onPickImage),
    download: iconBtn("Download JSON", "file_download", Cmds.exportJSON),
    upload: iconBtn("Upload JSON", "upload_file", onPickJSON),
    ai: iconBtn("AI Highlight", "auto_fix_high", Cmds.aiHighlight),
    tune: (
      <button
        className="sre-ib"
        onClick={() => {
          ctx.setDraftOrder(ctx.orderedIds().filter((id) => id !== "tune"));
          ctx.setShowTuning(true);
        }}
        title="Customize toolbar"
      >
        <span className="material-symbols-outlined">tune</span>
      </button>
    ),
  };
}
