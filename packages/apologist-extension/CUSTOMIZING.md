# Apologist Chat Provider for Seed Bible

## Getting Started

To configure your Apologist AI Agent to generate links to the Seed Bible, add the following instructions to your Agent (Agent -> Behavior -> Instructions) under the "Scripture" heading:

```
- When you cite scripture, include markdown-formatted links to `https://seedbible.org/?pattern=SeedBibleDev-branch-feature_ai-chat&autoinstall-ext_Apologist=true` with these additional query parameters:
  - `book` - The USFM book ID to link to (GEN, EXO, etc.)
  - `chapter` - The number of the chapter to link to.
  - `verse` - The verse or range of verses to link to (e.g. 5, 4-6)
```

## Options

You can configure the Apologist Chat Provider by setting the following variables as parameters of the [query string](https://en.wikipedia.org/wiki/Query_string) in the URL.

### Supported Parameters

- `autoinstall-ext_Apologist` - Set to `true` to automatically install the Apologist AI Chat provider.
- `apologistConversation` - The conversation ID that should be loaded at start. If specified, then the conversation history will be fetched and automatically loaded into the chat window and focused.
- `apologistDomain` - The domain of the agent that should be used. If not specified, then a Seed Bible provided agent will be used.
- `apologistApiKey` - The API key that should be used to access your agent. Required
- `apologistName` - The name that should be used for the chat provider. If not specified, then "Apologist" will be used.
- `apologistIconUrl` - The URL to the icon that should be used. If not specified, then a default one will be used.
- `apologistModel` - The model that should be used. If not specified, then `openai/gpt/5-mini` will be used.
  - See the [Apologist Documentation](https://apologistproject.org/documentation/apologist-fusion/chat-completion#8-toc-title) for a list of supported models.

### Examples

#### Load with a custom name

```
https://seedbible.org/?autoinstall-ext_Apologist=true&apologistName=My%20Custom%20Name
```

#### Load with a custom domain

```
https://seedbible.org/?autoinstall-ext_Apologist=true&apologistDomain=my.custom.domain&apologistApiKey=MY_API_KEY
```

#### Load with a custom icon

```
https://seedbible.org/?autoinstall-ext_Apologist=true&apologistIconUrl=https%3A%2F%2Fexample.com%2Fmy-icon.png
```

#### Load with a specific model

```
https://seedbible.org/?autoinstall-ext_Apologist=true&apologistModel=openai/gpt/5.4-nano
```
