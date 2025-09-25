// // // os.log(HighlightWords,'HighlightWords')
// await os.sleep(200)
// const { useState } = os.appHooks
// const AIPaintComponent = () => {
//     const [selectedTool, setSelectedTool] = useState('brush');
//     const [selectedColor, setSelectedColor] = useState('#3b82f6');

//     const tools = [
//         { id: 'brush', icon: '🖌️', name: 'Brush' },
//         { id: 'eraser', icon: '🧽', name: 'Eraser' },
//         { id: 'fill', icon: '🪣', name: 'Fill' },
//         { id: 'ai', icon: '✨', name: 'AI Generate' }
//     ];

//     const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

//     const handleToolSelect = (toolId) => {
//         setSelectedTool(toolId);
//     };

//     const handleColorSelect = (color) => {
//         setSelectedColor(color);
//     };

//     return (
//         <div style={{
//             width: '95%',
//             height: '123px',
//             background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//             borderRadius: '20px',
//             padding: '16px',
//             display: 'flex',
//             flexDirection: 'column',
//             justifyContent: 'space-between',
//             color: 'white',
//             fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
//             position: 'relative',
//             overflow: 'hidden'
//         }}>
//             <div style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//                 backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
//                          radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
//                          radial-gradient(circle at 40% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
//                 pointerEvents: 'none'
//             }} />

//             <div style={{
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//                 marginBottom: '12px',
//                 zIndex: 1
//             }}>
//                 <div style={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '8px'
//                 }}>
//                     <div style={{
//                         fontSize: '18px'
//                     }}>
//                         🎨
//                     </div>
//                     <span style={{
//                         fontSize: '16px',
//                         fontWeight: '600'
//                     }}>
//                         AI Paint
//                     </span>
//                 </div>

//                 <div style={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '4px',
//                     fontSize: '12px',
//                     color: 'rgba(255,255,255,0.8)'
//                 }}>
//                     <div style={{
//                         width: '8px',
//                         height: '8px',
//                         backgroundColor: '#22c55e',
//                         borderRadius: '50%'
//                     }} />
//                     Canvas Ready
//                 </div>
//             </div>

//             <div style={{
//                 display: 'flex',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 zIndex: 1
//             }}>
//                 <div style={{
//                     display: 'flex',
//                     gap: '6px'
//                 }}>
//                     {tools.map((tool) => (
//                         <button
//                             key={tool.id}
//                             onClick={() => handleToolSelect(tool.id)}
//                             style={{
//                                 width: '32px',
//                                 height: '32px',
//                                 borderRadius: '8px',
//                                 border: 'none',
//                                 backgroundColor: selectedTool === tool.id
//                                     ? 'rgba(255,255,255,0.3)'
//                                     : 'rgba(255,255,255,0.1)',
//                                 backdropFilter: 'blur(10px)',
//                                 cursor: 'pointer',
//                                 display: 'flex',
//                                 alignItems: 'center',
//                                 justifyContent: 'center',
//                                 fontSize: '14px',
//                                 transition: 'all 0.2s ease',
//                                 transform: selectedTool === tool.id ? 'scale(1.1)' : 'scale(1)',
//                                 boxShadow: selectedTool === tool.id
//                                     ? '0 4px 12px rgba(0,0,0,0.2)'
//                                     : 'none'
//                             }}
//                             title={tool.name}
//                         >
//                             {tool.icon}
//                         </button>
//                     ))}
//                 </div>

//                 <div style={{
//                     display: 'flex',
//                     gap: '4px',
//                     alignItems: 'center'
//                 }}>
//                     <span style={{
//                         fontSize: '12px',
//                         color: 'rgba(255,255,255,0.8)',
//                         marginRight: '4px'
//                     }}>
//                         Colors:
//                     </span>
//                     {colors.map((color) => (
//                         <button
//                             key={color}
//                             onClick={() => handleColorSelect(color)}
//                             style={{
//                                 width: '20px',
//                                 height: '20px',
//                                 borderRadius: '50%',
//                                 border: selectedColor === color ? '2px solid white' : '2px solid transparent',
//                                 backgroundColor: color,
//                                 cursor: 'pointer',
//                                 transition: 'all 0.2s ease',
//                                 transform: selectedColor === color ? 'scale(1.2)' : 'scale(1)',
//                                 boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
//                             }}
//                         />
//                     ))}
//                 </div>
//             </div>

//             <div style={{
//                 display: 'flex',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 marginTop: '8px',
//                 zIndex: 1
//             }}>
//                 <div style={{
//                     backgroundColor: 'rgba(255,255,255,0.2)',
//                     backdropFilter: 'blur(10px)',
//                     borderRadius: '12px',
//                     padding: '4px 12px',
//                     fontSize: '11px',
//                     color: 'rgba(255,255,255,0.9)'
//                 }}>
//                     {selectedTool === 'ai' ? '✨ AI Mode Active' : `${tools.find(t => t.id === selectedTool)?.name} Selected`}
//                 </div>
//             </div>
//         </div>
//     );
// };
// globalThis.ClearAllWordHighlights()

// HighlightWords({
//     // book: "Genesis",
//     // chapter: 1,
//     // verse: null,
//     words: ["created "],
//     color: "#000", // text color
//     backgroundColor: "#ffeb3b", // highlight color
//     onClick: (word, verseNumber) => {
//         console.log(`Clicked word "${word}" in verse ${verseNumber}`);
//         AddNowBarApp(<AIPaintComponent />, uuid())
        
//     }
// });