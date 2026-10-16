/*
 * Bundle entry for CCP4 Cloud: the Moorhen web component plus the CCP4 Cloud helpers, exposed as the
 * `moorhen` global. jsCoFE's js-lib/webCoot/webcoot.js drives it (see MOORHEN_HOST_API.md).
 */
export { registerMoorhenWebComponent, createCallbackBackupStorage } from "moorhen/web-component";
export type {
    MoorhenInstance,
    MoorhenWebComponent,
    LoadFilesResult,
    MtzMapRequest,
    StoredPreferences,
    MainMenuEntryAction,
    CloudBackup,
    BackupStorageCallbacks,
} from "moorhen/web-component";
export { loadCloudDictionary, getCloudExitData } from "./ccp4cloudHelpers";
export type { CloudExitData, CloudViewData } from "./ccp4cloudHelpers";
