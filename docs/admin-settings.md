# Admin settings (import to Dataverse)

This file lists admin-configurable settings used by the Know365 UI. Import these rows into your Dataverse config table (columns: `Key`, `Description`, `Value`, `Notes`) and then wire the table to the UI code that reads them (see `src/pages/AdminConfig.tsx` and `src/services/dataverseClient.ts`).

| Key | Description | Current value | Notes / Source |
| --- | --- | --- | --- |
| `carousel.layout` | Default carousel layout for a page | `card` | Default used in `AdminConfig` preview |
| `carousel.itemLimit` | Max items shown in carousel | `5` | Admin preview default |
| `carousel.intervalMs` | Autoplay interval in milliseconds | `4000` | Admin preview default |
| `carousel.autoplay` | Autoplay enabled | `false` | Admin preview default |
| `carousel.pauseOnHover` | Pause autoplay on hover | `true` | Admin preview default |
| `carousel.pauseOnFocus` | Pause autoplay on focus | `true` | Admin preview default |
| `carousel.showIndicators` | Show pagination indicators | `true` | Admin preview default |
| `carousel.showNav` | Show navigation arrows | (not set) | Toggle exists in UI; no preview default persisted |
| `carousel.recordId` | Dataverse record id for saved per-page carousel config | (null / set when saved) | Recorded after save in `AdminConfig` |
| `e365_knowledgecentreconfiguration` | Dataverse logical table used for carousel configs | `e365_knowledgecentreconfiguration` | Table referenced in code & conversation notes |
| `e365_formconfiguration` | Dataverse logical table for form mappings (proposed) | `e365_formconfiguration` | Used/proposed for saving form mapping JSON |
| `formMapping.keyPattern` | Key pattern for saved mappings | `mapping:<EntitySetName>` | Mappings saved in app config use this key prefix |
| `formMapping.value` | Mapping JSON (entity metadata & field mapping) | JSON blob | Stored in config value; used by Contribute runtime to render forms |
| `inputType.textarea` | Render as multiline text input | `textarea` -> multiline TextField | `src/pages/ContributeForm.tsx` maps types to controls |
| `inputType.number` | Render as numeric input | `number` -> TextField (type="number") | Number normalization handled in Contribute form |
| `inputType.date` | Render as date picker | `date` -> DatePicker (stored as ISO string) | Contribute saves ISO date string |
| `inputType.choice` | Render as choice/dropdown | `choice` -> Dropdown (options) | Admin FormBuilder needs options editor (pending) |
| `message.durationMs` | Default message / toast duration | `4000` | `showMessage` default in `AdminConfig` |
| `appConfig.items` | Generic key/value app configuration items | various | Managed via `getAppConfigItems` / `createAppConfigItem` |
| `metadata.primaryKey` | Detected entity primary key name | varies by entity | Discovered by `$metadata` inspector (entityMeta.keyName) |
| `metadata.displayProperty` | Detected entity display property | varies by entity | Discovered by `$metadata` inspector (entityMeta.displayName) |
| `metadata.valueProperty` | Detected entity value property | varies by entity | Discovered by `$metadata` inspector (entityMeta.valueName) |
| `env.VITE_CLIENT_ID` | MSAL / AAD client id (env) | (set in env) | Required for auth flows (`src/services/authConfig.ts`) |
| `env.VITE_DATAVERSE_API` | Dataverse API base URL (env) | (set in env) | Used by `src/services/dataverseClient.ts` |

Notes:
- `formMapping.value` is expected to be a JSON object describing field mappings and per-field `inputType` values; the Contribute runtime maps those `inputType` values to real controls.
- The `carousel.*` keys are intended to be stored per-page. Use an additional column like `PageKey` (e.g., `home`, `knowledge`, etc.) in your Dataverse table to scope them to pages.
- The UI currently recognizes the `mapping:` key prefix for saved mappings; import mapping rows using that naming convention.

If you want, I can:
- Export this table as CSV for direct Dataverse import.
- Add sample rows (for a few pages) to the file to import as example data.
