const { useState, useRef, useEffect } = os.appHooks

const ConfigurableFunctionCommands = ({ contextData }) => {

    const [commandInput, setCommandInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);
    const [showOptions, setShowOptions] = useState(false);
    const [currentOptions, setCurrentOptions] = useState([]);
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestedQuestions, setSuggestedQuestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const inputRef = useRef(null);
    const [translation, setTranslations] = useState()

    // Function library - developers can define their own functions
    const functionLibrary = {
        getSupportedLanguages: async () => {
            try {
                const res = await os.web.get('https://libretranslate.de/languages');
                return res.data;
            } catch (err) {
                return `Error fetching languages: ${err.message}`;
            }
        },

        // Generate suggested questions about the verse
        generateSuggestedQuestions: async (data) => {
            const prompt = `Based on this biblical verse: "${data.verse}" (${data.reference}),
             suggest exactly 3 common questions that people typically ask about this passage.
              Format your response as a array of strings, with each question being concise and practical like [q1,q2,13].
               Focus on questions about meaning, application, and context that would be most helpful for Bible study.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });

                // Parse the JSON response to extract questions
                let questions = [];
                try {
                    const parsed = JSON.parse(response.content || response);
                    questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
                } catch (parseError) {
                    // Fallback if JSON parsing fails
                    questions = [
                        "What is the main message of this verse?",
                        "How does this apply to my life today?",
                        "What is the historical context of this passage?"
                    ];
                }

                return questions.slice(0, 3); // Ensure only 3 questions
            } catch (error) {
                return [
                    "What is the main message of this verse?",
                    "How does this apply to my life today?",
                    "What is the historical context of this passage?"
                ];
            }
        },

        dynamicTranslate: async (data, langCode) => {
            const payload = {
                q: data.verse,
                source: "en",
                target: langCode,
                format: "text"
            };

            try {
                const res = await os.web.post('https://libretranslate.de/translate', payload, {
                    headers: { 'Content-Type': 'application/json' }
                });

                return `${langCode.toUpperCase()} Translation (${data.reference}):\n\n${res.data.translatedText}`;
            } catch (err) {
                return `Translation error: ${err.message}`;
            }
        },

        // AI Translation functions
        translateToHindi: async (data) => {
            const prompt = `Translate this biblical verse to Hindi with proper theological terms: "${data.verse}" (${data.reference})`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Hindi Translation (${data.reference}):\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Translation Error: ${error.message}`;
            }
        },

        translateToArabic: async (data) => {
            const prompt = `Translate this biblical verse to Arabic with proper theological terms: "${data.verse}" (${data.reference})`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Arabic Translation (${data.reference}):\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Translation Error: ${error.message}`;
            }
        },

        translateToSpanish: async (data) => {
            const prompt = `Translate this biblical verse to Spanish with proper theological terms: "${data.verse}" (${data.reference})`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Spanish Translation (${data.reference}):\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Translation Error: ${error.message}`;
            }
        },

        // AI Analysis functions
        analyzeHebrew: async (data) => {
            const prompt = `Provide a detailed Hebrew linguistic analysis of ${data.reference}: "${data.verse}". Include original Hebrew words, their meanings, grammatical structures, and theological significance.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Hebrew Analysis for ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Analysis Error: ${error.message}`;
            }
        },

        explainVerse: async (data) => {
            const prompt = `Provide a comprehensive explanation of ${data.reference}: "${data.verse}". Include theological, historical, and practical insights.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Explanation of ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Explanation Error: ${error.message}`;
            }
        },

        historicalContext: async (data) => {
            const prompt = `Provide detailed historical context for ${data.reference}: "${data.verse}". Include the time period, cultural background, and historical significance.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Historical Context for ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Context Error: ${error.message}`;
            }
        },

        // AI Commentary functions
        augustineCommentary: async (data) => {
            const prompt = `Write a commentary on ${data.reference}: "${data.verse}" in the style and theological perspective of Augustine of Hippo. Include his typical themes and approach.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Augustine-style Commentary on ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Commentary Error: ${error.message}`;
            }
        },

        calvinCommentary: async (data) => {
            const prompt = `Write a commentary on ${data.reference}: "${data.verse}" in the style and theological perspective of John Calvin. Focus on sovereignty, providence, and Reformed theology.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Calvin-style Commentary on ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Commentary Error: ${error.message}`;
            }
        },

        modernCommentary: async (data) => {
            const prompt = `Provide a modern biblical commentary on ${data.reference}: "${data.verse}". Include contemporary applications and relevance for today's readers.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Modern Commentary on ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Commentary Error: ${error.message}`;
            }
        },

        // AI Parallel functions
        findJohnParallel: async (data) => {
            const prompt = `Find and explain connections between ${data.reference}: "${data.verse}" and John 1:5. Provide detailed theological parallels and thematic connections.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Biblical Parallel:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Parallel Error: ${error.message}`;
            }
        },

        findPaulParallel: async (data) => {
            const prompt = `Find and explain connections between ${data.reference}: "${data.verse}" and 2 Corinthians 4:6. Provide detailed theological parallels and thematic connections.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Biblical Parallel - 2 Corinthians 4:6:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Parallel Error: ${error.message}`;
            }
        },

        findAllParallels: async (data) => {
            const prompt = `Find all biblical parallels and cross-references for ${data.reference}: "${data.verse}". Include both thematic and verbal parallels with explanations.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `All Biblical Parallels for ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Parallels Error: ${error.message}`;
            }
        },

        // AI Custom analysis functions
        theologicalImplications: async (data) => {
            const prompt = `Analyze the theological implications of ${data.reference}: "${data.verse}". Cover systematic theology, biblical theology, and practical theology applications.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Theological Implications of ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Theology Error: ${error.message}`;
            }
        },

        literaryAnalysis: async (data) => {
            const prompt = `Provide a comprehensive literary analysis of ${data.reference}: "${data.verse}". Include structure, literary devices, genre, and stylistic features.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Literary Analysis of ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Literary Error: ${error.message}`;
            }
        },

        // New AI-powered functions
        devotionalThoughts: async (data) => {
            const prompt = `Write devotional thoughts based on ${data.reference}: "${data.verse}". Include personal application, prayer points, and spiritual reflection.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Devotional Thoughts on ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Devotional Error: ${error.message}`;
            }
        },

        sermonOutline: async (data) => {
            const prompt = `Create a sermon outline based on ${data.reference}: "${data.verse}". Include main points, sub-points, illustrations, and applications.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Sermon Outline for ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Sermon Error: ${error.message}`;
            }
        },

        studyQuestions: async (data) => {
            const prompt = `Generate study questions for ${data.reference}: "${data.verse}". Include observation, interpretation, and application questions suitable for small groups.`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Study Questions for ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Study Error: ${error.message}`;
            }
        },

        customQuery: async (data, query) => {
            const prompt = `Regarding ${data.reference}: "${data.verse}", please answer this question: ${query}`;
            try {
                const response = await ai.chat(prompt, {
                    preferredModel: "openai/gpt/4o",
                    stream: false,
                    response_format: { "type": "json" }
                });
                return `Custom Analysis for ${data.reference}:\n\n${response?.content || response}`;
            } catch (error) {
                return `AI Query Error: ${error.message}`;
            }
        }
    };

    // Dynamic command configuration - developers define which functions to use
    const commandConfig = {
        '/explore': {
            description: 'Explore available commands',
            hasOptions: false,
            executeFunction: 'showCommands',
            isSpecial: true
        },
        '/translate': {
            description: 'Translate into...',
            hasOptions: true,
            options: translation ? [...translation] : [
                {
                    name: 'Hindi',
                    code: '🇮🇳',
                    executeFunction: 'translateToHindi'
                },
                {
                    name: 'Arabic',
                    code: '🇸🇦',
                    executeFunction: 'translateToArabic'
                },
                {
                    name: 'Spanish',
                    code: '🇪🇸',
                    executeFunction: 'translateToSpanish'
                }
            ]
        },
        '/hebrew': {
            description: 'Hebrew analysis',
            hasOptions: false,
            executeFunction: 'analyzeHebrew'
        },
        '/explain': {
            description: 'Explain this passage',
            hasOptions: false,
            executeFunction: 'explainVerse',
            acceptsQuery: true,
        },
        '/context': {
            description: 'Historical context',
            hasOptions: false,
            executeFunction: 'historicalContext'
        },
        '/commentary': {
            description: 'Biblical commentary',
            hasOptions: true,
            acceptsQuery: true,
            options: [
                {
                    name: 'Augustine',
                    executeFunction: 'augustineCommentary'
                },
                {
                    name: 'Calvin',
                    executeFunction: 'calvinCommentary'
                },
                {
                    name: 'Modern',
                    executeFunction: 'modernCommentary'
                }
            ]
        },
        '/parallels': {
            description: 'Find biblical parallels',
            hasOptions: false,
            executeFunction: 'findAllParallels',
            acceptsQuery: true
        },
        '/theology': {
            description: 'Theological implications',
            hasOptions: false,
            executeFunction: 'theologicalImplications'
        },
        '/literary': {
            description: 'Literary analysis',
            hasOptions: false,
            executeFunction: 'literaryAnalysis'
        },
        '/devotional': {
            description: 'Devotional thoughts',
            hasOptions: false,
            executeFunction: 'devotionalThoughts'
        },
        '/sermon': {
            description: 'Sermon outline',
            hasOptions: false,
            executeFunction: 'sermonOutline'
        },
        '/questions': {
            description: 'Study questions',
            hasOptions: false,
            executeFunction: 'studyQuestions'
        }
    };

    // Load suggested questions on component mount
    useEffect(() => {
        if (contextData && !suggestedQuestions.length) {
            loadSuggestedQuestions();
        }
    }, [contextData]);

    const loadSuggestedQuestions = async () => {
        setLoadingSuggestions(true);
        try {
            const questions = await functionLibrary.generateSuggestedQuestions(contextData);
            setSuggestedQuestions(questions);
        } catch (error) {
            console.error('Error loading suggested questions:', error);
        }
        setLoadingSuggestions(false);
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setCommandInput(value);

        if (result) {
            setResult('');
        }

        const [command, ...optionParts] = value.trim().split(' ');
        const optionInput = optionParts.join(' ').toLowerCase();

        const matchedCommand = Object.keys(commandConfig).find(cmd => cmd === command);

        if (matchedCommand && commandConfig[matchedCommand].hasOptions) {
            const fullOptions = commandConfig[matchedCommand].options;
            const filteredOptions = fullOptions.filter(opt =>
                opt.name.toLowerCase().includes(optionInput)
            );
            setCurrentOptions(filteredOptions);
            setShowOptions(true);
            setShowSuggestions(false);
            setSelectedSuggestion(0);
        } else if (value.startsWith('/')) {
            const commandPart = value.slice(1).toLowerCase();
            const filteredCommands = Object.keys(commandConfig).filter(cmd =>
                cmd.slice(1).toLowerCase().includes(commandPart)
            );
            setShowSuggestions(filteredCommands.length > 0);
            setShowOptions(false);
            setSelectedSuggestion(0);
        } else {
            setShowSuggestions(false);
            setShowOptions(false);
        }
    };

    const handleKeyDown = (e) => {
        if (showOptions) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestion(prev =>
                    prev < currentOptions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestion(prev =>
                    prev > 0 ? prev - 1 : currentOptions.length - 1
                );
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                selectOption(currentOptions[selectedSuggestion]);
            }
        } else if (showSuggestions) {
            const commandPart = commandInput.slice(1).toLowerCase();
            const filteredCommands = Object.keys(commandConfig).filter(cmd =>
                cmd.slice(1).toLowerCase().includes(commandPart)
            );

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestion(prev =>
                    prev < filteredCommands.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestion(prev =>
                    prev > 0 ? prev - 1 : filteredCommands.length - 1
                );
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                selectCommand(filteredCommands[selectedSuggestion]);
            }
        } else if (e.key === 'Enter') {
            executeCommand();
        }
    };

    // in selectCommand
    const selectCommand = (cmd) => {
        const cfg = commandConfig[cmd];
        if (cfg.hasOptions) {
            setCommandInput(cmd + ' ');
            setCurrentOptions(cfg.options);
            setShowOptions(true);
            setShowSuggestions(false);
        } else {
            const next = cmd; // no trailing space so it executes cleanly
            setCommandInput(next);
            setShowSuggestions(false);
            setShowOptions(false);
            executeCommand(next); // <-- run now
        }
        inputRef.current?.focus();
    };


    // in selectOption
    const selectOption = (option) => {
        const currentCommand = Object.keys(commandConfig)
            .find(cmd => commandInput.toLowerCase().startsWith(cmd.toLowerCase()));

        const next = `${currentCommand} ${option.name}`;
        setCommandInput(next);
        setShowOptions(false);
        inputRef.current?.focus();
        executeCommand(next); // <-- run now
    };


    // replace your executeCommand with this version
    const executeCommand = async (rawInput) => {
        const input = (rawInput ?? commandInput).trim();
        if (!input) return;

        setLoading(true);
        setShowSuggestions(false);
        setShowOptions(false);

        let response = 'Command not found. Please check available commands.';

        // Handle special /explore
        if (input.toLowerCase().startsWith('/explore')) {
            const commandList = Object.entries(commandConfig)
                .filter(([cmd]) => cmd !== '/explore')
                .map(([cmd, config]) => `${cmd} - ${config.description}`)
                .join('\n');

            response = `Available Commands:\n\n${commandList}\n\nTip: Type any command followed by a space to see options, or start typing to see suggestions.`;
            setResult(response);
            setLoading(false);
            return;
        }

        for (const [cmd, config] of Object.entries(commandConfig)) {
            if (input.toLowerCase().startsWith(cmd.toLowerCase()) && cmd !== '/explore') {
                const userQuery = input.slice(cmd.length).trim();

                if (config.hasOptions) {
                    const selectedOption = (config.options || []).find(option =>
                        input.toLowerCase().includes((option.name || '').toLowerCase())
                    );
                    if (selectedOption?.executeFunction) {
                        const fn = functionLibrary[selectedOption.executeFunction];
                        if (fn) response = await fn(contextData);
                    }
                } else {
                    const fnName = config.executeFunction;
                    const fn = functionLibrary[fnName];
                    if (fn) {
                        try {
                            if (config.acceptsQuery && userQuery) {
                                const fallbackFn = functionLibrary.customQuery;
                                response = fallbackFn
                                    ? await fallbackFn(contextData, userQuery)
                                    : 'Function for handling queries not found.';
                            } else {
                                response = await fn(contextData);
                            }
                        } catch (err) {
                            response = `Error executing function: ${err.message}`;
                        }
                    }
                }
                break;
            }
        }

        setResult(response);
        setLoading(false);
    };


    const handleSuggestedQuestion = async (question) => {
        const next = `/explain ${question}`;
        setCommandInput(next);
        inputRef.current?.focus();
        executeCommand(next); // <-- run now
    };


    const quickActions = [
        {
            label: 'Explore commands',
            action: () => {
                setCommandInput('/explore ');
                inputRef.current?.focus();
            }
        },
        ...Object.entries(commandConfig)
            .filter(([cmd]) => cmd !== '/explore')
            .slice(0, 2)
            .map(([cmd, config]) => ({
                label: config.description,
                action: () => {
                    if (config.hasOptions) {
                        setCommandInput(cmd + ' ');
                        setCurrentOptions(config.options);
                        setShowOptions(true);
                    } else {
                        setCommandInput(cmd + ' ');
                    }
                    inputRef.current?.focus();
                }
            }))
    ];

    const getFilteredCommands = () => {
        if (!commandInput.startsWith('/')) return [];
        const commandPart = commandInput.slice(1).toLowerCase();
        return Object.keys(commandConfig).filter(cmd =>
            cmd.slice(1).toLowerCase().includes(commandPart)
        );
    };

    const renderInput = () => {
        if (!commandInput) return null;

        const commandMatch = commandInput.match(/^(\/\w+)/);

        if (commandMatch) {
            const command = commandMatch[1];
            const rest = commandInput.slice(command.length);

            return (
                <span>
                    <span style={{ color: '#e67e22', fontWeight: '500' }}>{command}</span>
                    <span style={{ color: '#333' }}>{rest}</span>
                </span>
            );
        }

        return <span style={{ color: '#333' }}>{commandInput}</span>;
    };

    const filteredCommands = getFilteredCommands();

    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            maxWidth: '700px'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '2px solid #e67e22',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    padding: '16px 20px',
                    borderBottom: (showSuggestions || showOptions) ? '1px solid #f0f0f0' : 'none',
                    minHeight: result || loading ? 'auto' : '24px'
                }}>
                    {result ? (
                        <div>
                            <div style={{
                                fontSize: '14px',
                                color: '#666',
                                marginBottom: '12px',
                                paddingBottom: '8px',
                                borderBottom: '1px solid #f0f0f0'
                            }}>
                                {renderInput()}
                            </div>
                            <div style={{
                                fontSize: '15px',
                                lineHeight: '1.6',
                                color: '#333',
                                whiteSpace: 'pre-line',
                                marginTop: '-90px'
                            }}>
                                <BiblePassageDisplay content={result} />
                            </div>
                            <button
                                onClick={() => {
                                    setResult('');
                                    setCommandInput('');
                                    inputRef.current?.focus();
                                }}
                                style={{
                                    marginTop: '12px',
                                    backgroundColor: '#f0f0f0',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    color: '#666',
                                    cursor: 'pointer'
                                }}
                            >
                                New Command
                            </button>
                        </div>
                    ) : loading ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            color: '#999'
                        }}>
                            <div style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid #f0f0f0',
                                borderTop: '2px solid #e67e22',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            Executing {renderInput()}...
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={commandInput}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '16px',
                                    color: 'transparent',
                                    fontFamily: 'inherit',
                                    caretColor: '#333',
                                    position: 'relative',
                                    'z-index': 1000,
                                }}
                            />
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                            }}>
                                {commandInput ? renderInput() : (
                                    <span style={{ color: '#999' }}>/ explore commands</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {showSuggestions && !showOptions && !result && (
                    <div>
                        {filteredCommands.map((cmd, index) => (
                            <div
                                key={cmd}
                                onClick={() => selectCommand(cmd)}
                                style={{
                                    padding: '12px 20px',
                                    cursor: 'pointer',
                                    backgroundColor: index === selectedSuggestion ? '#f8f8f8' : 'transparent',
                                    fontSize: '15px',
                                    color: '#333'
                                }}
                                onMouseEnter={() => setSelectedSuggestion(index)}
                            >
                                <span style={{ fontWeight: '500', color: '#e67e22' }}>{cmd}</span>
                                <span style={{ color: '#999', marginLeft: '8px' }}>{commandConfig[cmd].description}</span>
                            </div>
                        ))}
                    </div>
                )}

                {showOptions && !result && (
                    <div style={{
                        maxHeight: '250px',
                        overflowY: 'auto'
                    }}>
                        {currentOptions.map((option, index) => (
                            <div
                                key={option.name || index}
                                onClick={() => selectOption(option)}
                                style={{
                                    padding: '12px 20px',
                                    cursor: 'pointer',
                                    backgroundColor: index === selectedSuggestion ? '#f8f8f8' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '15px',
                                    color: '#333'
                                }}
                                onMouseEnter={() => setSelectedSuggestion(index)}
                            >
                                {option.code && <span style={{ fontSize: '16px' }}>{option.code}</span>}
                                <span>{option.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {!commandInput && !showSuggestions && !showOptions && !result && !loading && (
                    <div>
                        <div style={{
                            display: 'flex',
                            padding: '12px 20px',
                            gap: '12px',
                            alignItems: 'center'
                        }}>
                            {quickActions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={action.action}
                                    style={{
                                        backgroundColor: '#f0f0f0',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '8px 14px',
                                        fontSize: '14px',
                                        color: '#333',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.15s ease',
                                        fontWeight: '400'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = '#e0e0e0';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = '#f0f0f0';
                                    }}
                                >
                                    {action.label}
                                </button>
                            ))}
                            <button
                                onClick={executeCommand}
                                style={{
                                    backgroundColor: '#e67e22',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    fontSize: '14px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    marginLeft: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '36px',
                                    fontWeight: '500'
                                }}
                            >
                                ↗
                            </button>
                        </div>

                        {suggestedQuestions.length > 0 && (
                            <div style={{
                                borderTop: '1px solid #f0f0f0',
                                padding: '16px 20px'
                            }}>
                                <div style={{
                                    fontSize: '13px',
                                    color: '#666',
                                    marginBottom: '12px',
                                    fontWeight: '500'
                                }}>
                                    Common questions about {contextData?.reference}:
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    {suggestedQuestions.map((question, index) => (
                                        <button
                                            key={index}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                handleSuggestedQuestion(question)
                                            }}
                                            style={{
                                                backgroundColor: 'transparent',
                                                border: '1px solid #e0e0e0',
                                                borderRadius: '6px',
                                                padding: '10px 12px',
                                                fontSize: '14px',
                                                color: '#555',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.15s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = '#f8f8f8';
                                                e.target.style.borderColor = '#d0d0d0';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = 'transparent';
                                                e.target.style.borderColor = '#e0e0e0';
                                            }}
                                        >
                                            <span style={{
                                                color: '#e67e22',
                                                fontSize: '12px',
                                                flexShrink: 0
                                            }}>
                                                ?
                                            </span>
                                            {question}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {loadingSuggestions && (
                            <div style={{
                                borderTop: '1px solid #f0f0f0',
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                color: '#999'
                            }}>
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid #f0f0f0',
                                    borderTop: '2px solid #e67e22',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                <span style={{ fontSize: '13px' }}>Loading suggested questions...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};


const BiblePassageDisplay = ({ content }) => {
    if (!content) return null;

    const processContent = (text) => {
        // Split into paragraphs and clean up more aggressively
        const paragraphs = text.split('\n\n')
            .map(p => p.trim())
            .filter(p => p.length > 0);

        return paragraphs.map((paragraph, index) => {
            const lines = paragraph.split('\n')
                .map(line => line.trim())
                .filter(line => {
                    // Filter out empty lines and separator lines
                    if (!line || line.length === 0) return false;
                    if (/^[-_=+*\s]*$/.test(line)) return false;
                    return line.length >= 2;
                });

            // Don't render paragraph block if no valid lines remain
            if (lines.length === 0) return null;

            return (
                <div key={index} className="paragraph-block">
                    {lines.map((line, lineIndex) => renderLine(line, `${index}-${lineIndex}`))}
                </div>
            );
        }).filter(block => block !== null);
    };

    const renderLine = (line, key) => {
        // Skip empty lines and lines with only dashes, spaces, or minimal content
        if (!line || !line.trim()) return null;

        // Skip lines that are just dashes, underscores, or other separator characters
        const trimmedLine = line.trim();
        if (/^[-_=+*\s]*$/.test(trimmedLine) || trimmedLine.length < 2) return null;

        // Main headings (### )
        if (line.startsWith('### ')) {
            const title = line.replace('### ', '');
            return (
                <h3 key={key} className="main-heading">
                    {processInlineFormatting(title)}
                </h3>
            );
        }

        // Secondary headings (## )
        if (line.startsWith('## ')) {
            const title = line.replace('## ', '');
            return (
                <h4 key={key} className="secondary-heading">
                    {processInlineFormatting(title)}
                </h4>
            );
        }

        // Block quotes (> )
        if (line.startsWith('> ')) {
            const quote = line.replace(/^>\s*/, '');
            return (
                <blockquote key={key} className="scripture-quote">
                    {processInlineFormatting(quote)}
                </blockquote>
            );
        }

        // Bullet points (- )
        if (line.startsWith('- ')) {
            const text = line.replace('- ', '');
            return (
                <div key={key} className="bullet-point">
                    <span className="bullet">•</span>
                    <span className="bullet-text">{processInlineFormatting(text)}</span>
                </div>
            );
        }

        // Numbered lists (1. 2. etc.)
        const numberedMatch = line.match(/^(\d+)\.\s(.+)/);
        if (numberedMatch) {
            return (
                <div key={key} className="numbered-point">
                    <span className="number">{numberedMatch[1]}.</span>
                    <span className="numbered-text">{processInlineFormatting(numberedMatch[2])}</span>
                </div>
            );
        }

        // Regular paragraph
        return (
            <p key={key} className="regular-text">
                {processInlineFormatting(line)}
            </p>
        );
    };

    const processInlineFormatting = (text) => {
        // Handle bold text (**text**)
        const parts = text.split(/(\*\*[^*]+\*\*)/g);

        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                const boldText = part.slice(2, -2);
                return <strong key={index} className="bold-text">{boldText}</strong>;
            }

            // Handle italic text (*text*)
            if (part.startsWith('*') && part.endsWith('*') && !part.includes('**')) {
                const italicText = part.slice(1, -1);
                return <em key={index} className="italic-text">{italicText}</em>;
            }

            return part;
        });
    };

    return (
        <div className="bible-passage-container">
            <style jsx>{`
        .bible-passage-container {
  font-family: "Newsreader", "Georgia", "Times New Roman", serif;
  line-height: 1.15;
  color: #2c3e50;
  max-width: 100%;
  font-size: 15px;
}

/* Normalize margins for all block elements */
.bible-passage-container h3,
.bible-passage-container h4,
.bible-passage-container p,
.bible-passage-container blockquote,
.bible-passage-container .bullet-point,
.bible-passage-container .numbered-point {
  margin-top: 0rem;
  margin-bottom: 0rem;
}

/* Paragraph container */
.paragraph-block {
  margin-bottom: 0rem;
}
.paragraph-block:last-child {
  margin-bottom: 0;
}

/* Main heading */
.main-heading {
  font-size: 1.15em;
  font-weight: 600;
  color: #d35400;
  margin: 0rem 0 0rem 0;
  padding-bottom: 0.05rem;
  border-bottom: 1px solid #f39c12;
  line-height: 1.1;
}

/* Secondary heading */
.secondary-heading {
  font-size: 1.05em;
  font-weight: 500;
  color: #e67e22;
  margin: 0rem 0 0.1rem 0;
  line-height: 1.1;
}

/* Scripture quote */
.scripture-quote {
  background: linear-gradient(135deg, #fdf6f0 0%, #fef9f5 100%);
  border-left: 3px solid #e67e22;
  margin: 0rem 0;
  padding: 0.25rem 0.5rem;
  border-radius: 0 4px 4px 0;
  font-style: italic;
  color: #34495e;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  position: relative;
}
.scripture-quote::before {
  content: '"';
  position: absolute;
  top: -0.05rem;
  left: 0.3rem;
  font-size: 1.3em;
  color: #e67e22;
  opacity: 0.25;
  font-family: "Newsreader", "Georgia", "Times New Roman", serif;
}

/* Bullet points */
.bullet-point {
  display: flex;
  align-items: flex-start;
  margin: 0rem 0;
  padding-left: 0.1rem;
}
.bullet {
  color: #e67e22;
  font-weight: bold;
  margin-right: 0rem;
  flex-shrink: 0;
  margin-top: 0;
}
.bullet-text {
  flex: 1;
}

/* Numbered lists */
.numbered-point {
  display: flex;
  align-items: flex-start;
  margin: 0rem 0;
  padding-left: 0.1rem;
}
.number {
  color: #e67e22;
  font-weight: 600;
  margin-right: 0rem;
  flex-shrink: 0;
  min-width: 1rem;
}
.numbered-text {
  flex: 1;
}

/* Regular text */
.regular-text {
  margin: 0rem 0;
  text-align: justify;
  hyphens: auto;
}

/* Inline formatting */
.bold-text {
  color: #2c3e50;
  font-weight: 600;
}
.italic-text {
  color: #34495e;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .bible-passage-container {
    font-size: 14px;
    line-height: 1.2;
  }
  .scripture-quote {
    margin: 0rem 0;
    padding: 0.3rem 0.4rem;
  }
  .main-heading {
    font-size: 1.1em;
    margin: 0em 0;
  }
  .secondary-heading {
    font-size: 1.02em;
    margin: 0rem 0;
  }
}

/* Print styles */
@media print {
  .bible-passage-container {
    font-size: 12pt;
    line-height: 1.3;
    color: black;
  }
  .main-heading,
  .secondary-heading,
  .bullet,
  .number {
    color: black;
  }
  .scripture-quote {
    background: #f9f9f9;
    box-shadow: none;
  }
}

      `}</style>
            {processContent(content)}
        </div>
    );
};
export { ConfigurableFunctionCommands };

