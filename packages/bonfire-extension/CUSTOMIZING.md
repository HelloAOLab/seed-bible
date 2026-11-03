# Bonfire Chat Provider for Seed Bible

## Options

You can configure the Bonfire Chat Provider by setting the following variables as parameters of the [query string](https://en.wikipedia.org/wiki/Query_string) in the URL.

### Supported Parameters

- `autoinstall-ext_Bonfire` - Set to `true` to automatically install the Bonfire AI Chat provider.
- `bonfireOrgId` - The organization ID from your Bonfire account. If not specified, the Seed Bible organization is used.
- `bonfireAiId` - The AI ID from your Bonfire account. If not specified, the Seed Bible AI is used.
- `bonfireApiUrl` - The URL of a Bonfire `/v1/chat/completions` endpoint. When set, the chat provider sends the full conversation and Seed Bible's tools with every request, and runs the tools Bonfire asks for (tool calling). When not set, the Bonfire session API is used, which does not support tools.
- `bonfireApiKey` - An API key sent as a bearer token to `bonfireApiUrl`. Optional.
- `bonfireName` - The name that should be used for the chat provider. If not specified, then "Bonfire" will be used.
- `bonfireIconUrl` - The URL to the icon that should be used. If not specified, then a default one will be used.

### Examples

#### Basic setup with required parameters

```
https://seedbible.org/?autoinstall-ext_Bonfire=true&bonfireOrgId=YOUR_ORG_ID&bonfireAiId=YOUR_AI_ID
```

#### Use the Bonfire Dev endpoint with tool calling

```
https://seedbible.org/?autoinstall-ext_Bonfire=true&bonfireApiUrl=https%3A%2F%2Fdev-api.heybonfire.com%2Fv1%2Fchat%2Fcompletions&bonfireApiKey=YOUR_API_KEY
```

#### Load with a custom name

```
https://seedbible.org/?autoinstall-ext_Bonfire=true&bonfireOrgId=YOUR_ORG_ID&bonfireAiId=YOUR_AI_ID&bonfireName=My%20Custom%20Name
```

#### Load with a custom icon

```
https://seedbible.org/?autoinstall-ext_Bonfire=true&bonfireOrgId=YOUR_ORG_ID&bonfireAiId=YOUR_AI_ID&bonfireIconUrl=https%3A%2F%2Fexample.com%2Fmy-icon.png
```
