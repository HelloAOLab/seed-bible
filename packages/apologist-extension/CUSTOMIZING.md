# Apologist Chat Provider for Seed Bible

## Getting Started

#### Deep-linking to the Seed Bible

To configure your Apologist AI Agent to generate links to the Seed Bible, add the following instructions to your Agent (Agent -> Behavior -> Instructions) under the "Scripture" heading:

```
- When you cite scripture, include markdown-formatted links to `https://seedbible.org/?pattern=SeedBibleDev-branch-feature_ai-chat&autoinstall-ext_Apologist=true` with these additional query parameters:
  - `book` - The USFM book ID to link to (GEN, EXO, etc.)
  - `chapter` - The number of the chapter to link to.
  - `verse` - The verse or range of verses to link to (e.g. 5, 4-6)
```

#### Conversation hand-off

If you want to prompt users to continue the conversation in the Seed Bible, you can follow these steps to configure your Agent:

1. Go to your Agent's settings in the [Apologist AI Dashboard](https://app.apologist.com/)
2. Enable the Calls to Action capability
   1. Agent -> General -> Capabilities -> Orchestration -> Calls to Action
   2. Once enabled, you will see a section near the bottom of the page called "Calls to Action".
3. Click "Add Call to Action"
4. In the modal, enter the following information:
   1. For name, enter "Open in Seed Bible"
   2. Make sure that "Active" is checked on
   3. In the Content tab, do the following:
      1. type "Open in Seed Bible"
      2. Select the text you just typed
      3. Click the "Link" button in the text editor toolbar
      4. Enter the following for the URL:

      ```
      https://seedbible.org/?autoinstall-ext_Apologist=true&apologistConversation={conversation}
      ```

      5. Click "Submit"

## Options

You can configure the Apologist Chat Provider by setting the following variables as parameters of the [query string](https://en.wikipedia.org/wiki/Query_string) in the URL.

### Supported Parameters

- `autoinstall-ext_Apologist` - Set to `true` to automatically install the Apologist AI Chat provider.
- `apologistConversation` - The conversation ID that should be loaded at start. If specified, then the conversation history will be fetched and automatically loaded into the chat window and focused.
  - If you specify `apologistConversation`, then you should also include `apologistDomain` and `apologistApiKey`.
  - In a Call to Action, you can use the `{conversation}` merge tag in the content to include the current conversation ID in the URL.
    - e.g. The link could point to `https://seedbible.org?autoinstall-ext_Apologist=true&apologistConversation={conversation}&apologistDomain=my.agent.domain.bot&apologistApiKey=my_apologist_api_key`
- `apologistShareToken` - The share token that should be used to load the conversation. If specified, then the conversation history will be fetched and automatically loaded into the chat window and focused.
  - If specified, then this parameter overrides `apologistConversation`.
  - If you specify `apologistShareToken`, then you should also include `apologistDomain` and `apologistApiKey`.
  - In a Call to Action, you can use the `{share_token}` merge tag in the content to include the current conversation ID in the URL.
    - e.g. The link could point to `https://seedbible.org?autoinstall-ext_Apologist=true&apologistShareToken={share_token}&apologistDomain=my.agent.domain.bot&apologistApiKey=my_apologist_api_key`
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
