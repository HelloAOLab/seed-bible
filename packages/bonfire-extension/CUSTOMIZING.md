# Bonfire Chat Provider for Seed Bible

## Options

You can configure the Bonfire Chat Provider by setting the following variables as parameters of the [query string](https://en.wikipedia.org/wiki/Query_string) in the URL.

### Supported Parameters

- `autoinstall-ext_Bonfire` - Set to `true` to automatically install the Bonfire AI Chat provider.
- `bonfireApiKey` - The API key that should be used to access Bonfire. Required.
- `bonfireOrgId` - The organization ID from your Bonfire account. Required.
- `bonfireAiId` - The AI ID from your Bonfire account. Required.
- `bonfireName` - The name that should be used for the chat provider. If not specified, then "Bonfire" will be used.
- `bonfireIconUrl` - The URL to the icon that should be used. If not specified, then a default one will be used.

### Examples

#### Basic setup with required parameters

```
https://seedbible.org/?autoinstall-ext_Bonfire=true&bonfireApiKey=YOUR_API_KEY&bonfireOrgId=YOUR_ORG_ID&bonfireAiId=YOUR_AI_ID
```

#### Load with a custom name

```
https://seedbible.org/?autoinstall-ext_Bonfire=true&bonfireApiKey=YOUR_API_KEY&bonfireOrgId=YOUR_ORG_ID&bonfireAiId=YOUR_AI_ID&bonfireName=My%20Custom%20Name
```

#### Load with a custom icon

```
https://seedbible.org/?autoinstall-ext_Bonfire=true&bonfireApiKey=YOUR_API_KEY&bonfireOrgId=YOUR_ORG_ID&bonfireAiId=YOUR_AI_ID&bonfireIconUrl=https%3A%2F%2Fexample.com%2Fmy-icon.png
```
