import React from "react";
import ReactDOM from "react-dom/client";

import { MoorhenCloudApp, MoorhenCloudControls } from "./components/MoorhenCloudApp";
import {
    CloudBackupInterface,
    CloudStorageInstance,
    CloudStorageInstanceInterface,
} from "./utils/MoorhenCloudTimeCapsule";
import {
    MoorhenMolecule,
    MoorhenPreferences,
    addMolecule,
    setOrigin,
    setZoom,
    setQuat,
    setLightPosition,
    setAmbient,
    setSpecular,
    setDiffuse,
    setFogStart,
    setFogEnd,
    setClipStart,
    setClipEnd,
    setBackgroundColor,
    // viewDataSession,
    // PreferencesValues,
    MoorhenReduxStoreType,
    MoorhenProvider,
    // MoorhenStoreRootState,
} from "moorhen/react-lib";
import type { MtzMapRequest } from "moorhen/react-lib";
import type { moorhen } from "moorhen/types/moorhen.d.ts";
import { guid } from "./utils/utils";
import { MoorhenAceDRGInstance } from "./utils/MoorhenAceDRGInstance";
import reportWebVitals from "./reportWebVitals";
import parse from "html-react-parser";
type viewDataSession = moorhen.viewDataSession;

// Preferences as exchanged with the host (CCP4 Cloud): a verbatim copy of what Moorhen keeps in its
// preference storage, i.e. only the preferences that differ from the default, each as { version, value }.
// Moorhen checks the versions itself when it restores them, so the host never needs to understand the content.
const PREFERENCES_FORMAT = "moorhen-1.0";
type StoredPreferences = {
    format: typeof PREFERENCES_FORMAT;
    entries: { [label: string]: { version: number; value: unknown } };
};

type PdbInputFileType = {
    type: "pdb";
    uniqueId?: string;
    args: [string, string];
};

// One entry per MTZ file, with all the maps read from it
type MapInputFileType = {
    type: "mtz";
    uniqueId?: string;
    url: string;
    maps: MtzMapRequest[];
};

type LegendInputFileType = {
    type: "legend";
    uniqueId?: string;
    args: [string];
};

type LigandInputFileType = {
    type: "ligand";
    uniqueId?: string;
    args: [string, string[]];
};

type PAEInputFileType = {
    type: "PAE";
    uniqueId?: string;
    args: [string, string];
};

export default class MoorhenWrapper {
    urlPrefix: string;
    monomerLibrary: string;
    controls: MoorhenCloudControls;
    updateInterval: number;
    workMode: "build" | "view" | "view-update";
    inputFiles: (PdbInputFileType | MapInputFileType | LegendInputFileType | LigandInputFileType | PAEInputFileType)[];
    rootId: string;
    preferences: StoredPreferences | null;
    preferenceStorage: LocalForage;
    cachedLegend: string;
    cachedLigandDictionaries: string[];
    noDataLegendMessage: React.JSX.Element;
    exitCallback: (arg0: {
        viewData: viewDataSession;
        molData: { molName: string; pdbData: string; mmcifData: string }[];
        ligData: string[];
    }) => Promise<void>;
    exportPreferencesCallback: (arg0: StoredPreferences) => void;
    backupStorageInstance: CloudStorageInstanceInterface;
    aceDRGInstance: MoorhenAceDRGInstance;
    viewSettings: viewDataSession;
    paeData: { [fileName: string]: string };
    // input file uniqueId -> uniqueId of the molecule created by moorhenInstance.files.loadFiles
    loadedMoleculeIds: { [inputFileId: string]: string };
    // input file uniqueId -> uniqueIds of the maps created by moorhenInstance.files.loadMtz
    loadedMapIds: { [inputFileId: string]: string[] };

    constructor(urlPrefix: string) {
        this.urlPrefix = urlPrefix;
        this.monomerLibrary = `${this.urlPrefix}/monomers/`;
        this.controls = null;
        this.updateInterval = null;
        this.workMode = "build";
        this.inputFiles = null;
        this.rootId = null;
        this.preferences = null;
        // Same storage that Moorhen's preference persistence reads from and writes to
        this.preferenceStorage = new MoorhenPreferences().localStorageInstance;
        this.cachedLegend = null;
        this.cachedLigandDictionaries = [];
        this.noDataLegendMessage = parse("<div></div>") as React.JSX.Element;
        this.exitCallback = async () => {};
        this.exportPreferencesCallback = () => {};
        this.backupStorageInstance = new CloudStorageInstance();
        this.aceDRGInstance = new MoorhenAceDRGInstance();
        this.viewSettings = null;
        this.paeData = {};
        this.loadedMoleculeIds = {};
        this.loadedMapIds = {};
        reportWebVitals();
    }

    setViewSettings(newSettings: viewDataSession) {
        this.viewSettings = newSettings;
    }

    getViewSettings(store: MoorhenReduxStoreType) {
        const viewData: viewDataSession = {
            origin: store.getState().sceneSettings.origin as [number, number, number],
            backgroundColor: store.getState().sceneSettings.backgroundColor,
            ambientLight: store.getState().sceneSettings.ambient,
            diffuseLight: store.getState().sceneSettings.diffuse,
            lightPosition: store.getState().sceneSettings.lightPosition,
            specularLight: store.getState().sceneSettings.specular,
            fogStart: store.getState().sceneSettings.fogStart,
            fogEnd: store.getState().sceneSettings.fogEnd,
            zoom: store.getState().sceneSettings.zoom,
            doDrawClickedAtomLines: false,
            clipStart: store.getState().sceneSettings.clipStart * -1,
            clipEnd: store.getState().sceneSettings.clipEnd,
            specularPower: store.getState().sceneSettings.specularPower,
            quat4: store.getState().glRef.quat,
            doPerspectiveProjection: store.getState().sceneSettings.doPerspectiveProjection,
            edgeDetection: {
                enabled: store.getState().sceneSettings.doEdgeDetect,
                depthScale: store.getState().sceneSettings.edgeDetectDepthScale,
                depthThreshold: store.getState().sceneSettings.edgeDetectDepthThreshold,
                normalScale: store.getState().sceneSettings.edgeDetectNormalScale,
                normalThreshold: store.getState().sceneSettings.edgeDetectNormalThreshold,
            },
            shadows: store.getState().sceneSettings.doShadow,
            ssao: {
                enabled: store.getState().sceneSettings.doSSAO,
                radius: store.getState().sceneSettings.ssaoRadius,
                bias: store.getState().sceneSettings.ssaoBias,
            },
            blur: {
                enabled: store.getState().sceneSettings.useOffScreenBuffers,
                radius: store.getState().sceneSettings.depthBlurRadius,
                depth: store.getState().sceneSettings.depthBlurDepth,
            },
        };
        return viewData;
    }

    setAceDRGMakeLinkCallback(
        functionCallback: (arg0: moorhen.createCovLinkAtomInput, arg1: moorhen.createCovLinkAtomInput) => void,
    ) {
        this.aceDRGInstance.createCovalentLink = functionCallback;
    }

    setBackupSaveListener(functionCallback: (arg0: CloudBackupInterface) => Promise<string | void>) {
        this.backupStorageInstance.exportBackupCallback = functionCallback;
    }

    setBackupLoadListener(functionCallback: (arg0: string | number) => Promise<CloudBackupInterface | void>) {
        this.backupStorageInstance.importBackupCallback = functionCallback;
    }

    setRemoveBackupListener(functionCallback: (arg: string | number) => Promise<void>) {
        this.backupStorageInstance.removeBackupCallback = functionCallback;
    }

    setBackupListLoadListener(functionCallback: () => Promise<CloudBackupInterface[]>) {
        this.backupStorageInstance.loadBackupList = functionCallback;
    }

    setWorkMode(mode: "build" | "view" | "view-update" = "build") {
        if (["build", "view", "view-update"].includes(mode)) {
            this.workMode = mode;
        } else {
            console.error(`Unrecognised working mode set in moorhen ${mode}`);
        }
    }

    setNoDataLegendMessage(htmlString: string) {
        try {
            this.noDataLegendMessage = parse(htmlString) as React.JSX.Element;
        } catch (err) {
            console.log("Unable to parse legend html string");
            console.log(err);
        }
    }

    // Preferences previously sent to the host through addOnChangePreferencesListener; anything else
    // (e.g. the flat pre-1.0 format) is ignored, as Moorhen 1.0 would discard it anyway
    setPreferences(preferences: unknown) {
        const stored = preferences as StoredPreferences;
        this.preferences = stored?.format === PREFERENCES_FORMAT && stored.entries ? stored : null;
    }

    setRootId(rootId: string) {
        this.rootId = rootId;
    }

    setInputFiles(inputFiles: (PdbInputFileType | MapInputFileType | LegendInputFileType | LigandInputFileType)[]) {
        this.inputFiles = inputFiles.map((inputFile) => {
            return { uniqueId: guid(), ...inputFile };
        });
    }

    setUpdateInterval(milliseconds: number) {
        this.updateInterval = milliseconds;
    }

    setMonomerLibrary(uri: string) {
        this.monomerLibrary = uri;
    }

    addOnExitListener(
        callbackFunction: (arg0: {
            viewData: viewDataSession;
            molData: { molName: string; pdbData: string; mmcifData: string }[];
            ligData: string[];
        }) => Promise<void>,
    ) {
        this.exitCallback = callbackFunction;
    }

    addOnChangePreferencesListener(callbackFunction: (arg0: StoredPreferences) => void) {
        this.exportPreferencesCallback = callbackFunction;
    }

    // Moorhen calls this after it has stored a changed preference. It is not called when a preference is
    // set back to its default (the stored entry is just removed), so exit() exports them again as well.
    onChangePreferencesListener(_key: string, _value: unknown): void {
        this.exportPreferences().catch((err) => console.log(err));
    }

    async exportPreferences(): Promise<void> {
        const entries: StoredPreferences["entries"] = {};
        await this.preferenceStorage.iterate((entry: { version: number; value: unknown }, label: string) => {
            entries[label] = entry;
        });
        this.exportPreferencesCallback({ format: PREFERENCES_FORMAT, entries });
    }

    forwardControls(controls: MoorhenCloudControls) {
        console.log("Fetched controls", { controls });
        this.controls = controls;
    }

    // Must run before Moorhen is rendered: Moorhen restores its preferences from this storage on start-up.
    // The host's copy is the reference, so whatever this browser stored before is replaced.
    async importPreferences(preferences: StoredPreferences | null) {
        await this.preferenceStorage.clear();
        if (preferences) {
            await Promise.all(
                Object.entries(preferences.entries).map(([label, entry]) => this.preferenceStorage.setItem(label, entry)),
            );
        }
    }

    addStyleSheet(uri: string) {
        const head = document.head;
        const style: any = document.createElement("link");
        style.href = uri;
        style.rel = "stylesheet";
        style.async = true;
        style.type = "text/css";
        head.appendChild(style);
    }

    async canFetchFile(url: string, timeout: number = 3000) {
        const timeoutSignal = AbortSignal.timeout(timeout);
        try {
            const response = await fetch(url, { method: "HEAD", signal: timeoutSignal });
            if (response.ok) {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            console.log(err);
            return false;
        }
    }

    applyView(store: MoorhenReduxStoreType) {
        if (this.viewSettings) {
            store.dispatch(setAmbient(this.viewSettings.ambientLight));
            store.dispatch(setSpecular(this.viewSettings.specularLight));
            store.dispatch(setDiffuse(this.viewSettings.diffuseLight));
            store.dispatch(setLightPosition(this.viewSettings.lightPosition));
            store.dispatch(setZoom(this.viewSettings.zoom));
            store.dispatch(setQuat(this.viewSettings.quat4));
            store.dispatch(setOrigin(this.viewSettings.origin));
            store.dispatch(setFogStart(this.viewSettings.fogStart));
            store.dispatch(setFogEnd(this.viewSettings.fogEnd));
            store.dispatch(setBackgroundColor(this.viewSettings.backgroundColor));
            store.dispatch(setClipStart(this.viewSettings.clipStart * -1));
            store.dispatch(setClipEnd(this.viewSettings.clipEnd));
        }
    }

    async loadMtzData(uniqueId: string, url: string, maps: MtzMapRequest[]): Promise<void> {
        const loaded = await this.controls.moorhenInstance.files.loadMtz(url, maps, "cloud");
        this.loadedMapIds[uniqueId] = loaded.map((item) => item.uniqueID);
    }

    async loadPdbData(uniqueId: string, inputFile: string, molName: string): Promise<MoorhenMolecule> {
        // loadFiles picks the parser from the file extension and names the molecule after the
        // file name (extension stripped), so pass molName + the extension of the source URL
        const url = new URL(inputFile, document.baseURI);
        const extension = url.pathname.match(/\.(pdb|ent|cif|mmcif)$/i)?.[0] ?? ".pdb";
        const loaded = await this.controls.moorhenInstance.files.loadFiles(
            { url, filename: `${molName}${extension}` },
            "cloud",
        );
        const result = loaded?.find((item) => item.type === "molecule");
        if (!result) {
            throw new Error(`Cannot load molecule from ${inputFile}`);
        }
        this.loadedMoleculeIds[uniqueId] = result.uniqueID;
        const newMolecule = this.controls.moorhenInstance.getMolecule(result.uniqueID);
        this.cachedLigandDictionaries.forEach((ligandDict) => ligandDict && newMolecule.cacheLigandDict(ligandDict));
        return newMolecule;
    }

    getLoadedMolecule(inputFileId: string): MoorhenMolecule | undefined {
        const moleculeId = this.loadedMoleculeIds[inputFileId];
        return moleculeId ? this.controls.moorhenInstance.getMolecule(moleculeId) : undefined;
    }

    async getMonomerOnStart(url: string, ligandNames: string[]) {
        await Promise.all(
            ligandNames.map(async (ligandName) => {
                const getMonomerResult = await this.controls.commandCentre.current.cootCommand(
                    {
                        returnType: "status",
                        command: "get_monomer_and_position_at",
                        commandArgs: [ligandName, -999999, 0, 0, 0],
                    },
                    true,
                );
                if (getMonomerResult.data.result.status === "Completed" && getMonomerResult.data.result.result !== -1) {
                    const newMolecule = new MoorhenMolecule(this.controls.moorhenInstance);
                    newMolecule.molNo = getMonomerResult.data.result.result;
                    newMolecule.name = ligandName;
                    newMolecule.setBackgroundColour(this.controls.store.getState().sceneSettings.backgroundColor);
                    this.cachedLigandDictionaries.forEach(
                        (ligandDict) => ligandDict && newMolecule.cacheLigandDict(ligandDict),
                    );
                    await newMolecule.fetchIfDirtyAndDraw("CBs");
                    this.controls.dispatch(addMolecule(newMolecule));
                } else {
                    console.log("Error getting monomer... Missing dictionary?");
                }
            }),
        );
    }

    async loadLigandData(url: string, ligandNames: string[]): Promise<string> {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const fileContents = await response.text();
                await this.controls.commandCentre.current.cootCommand(
                    {
                        returnType: "status",
                        command: "read_dictionary_string",
                        commandArgs: [fileContents, -999999],
                        changesMolecules: [],
                    },
                    true,
                );
                return fileContents;
            } else {
                console.log(`Unable to fetch legend file ${url}`);
            }
        } catch (err) {
            console.log(err);
        }
    }

    async loadLegend(url: string): Promise<void> {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const fileContents = await response.text();
                if (fileContents !== this.cachedLegend) {
                    this.controls.setNotifyNewContent(true);
                    const domComponent = parse(fileContents) as React.JSX.Element;
                    this.controls.setLegendText(domComponent);
                    this.cachedLegend = fileContents;
                    setTimeout(() => this.controls.setNotifyNewContent(false), 4000);
                }
            } else {
                console.log(`Unable to fetch legend file ${url}`);
            }
        } catch (err) {
            console.log(err);
        }
    }

    async loadPAE(url: string, fileName: string) {
        const response = await fetch(url);
        if (response.ok) {
            const fileContents = await response.text();
            this.paeData[fileName] = fileContents;
        } else {
            console.log(`Unable to fetch PAE file ${url}`);
        }
    }

    async loadInputFiles(): Promise<void> {
        this.cachedLigandDictionaries = await Promise.all(
            this.inputFiles
                .filter((file) => file.type === "ligand")
                .map((file) => this.loadLigandData(...(file.args as [string, string[]]))),
        );

        try {
            await Promise.all(
                this.inputFiles.map((file) => {
                    if (file.type === "pdb") {
                        return this.loadPdbData(file.uniqueId, ...file.args);
                    } else if (file.type === "mtz") {
                        return this.loadMtzData(file.uniqueId, file.url, file.maps);
                    } else if (file.type === "legend") {
                        return this.loadLegend(...file.args);
                    } else if (file.type === "ligand") {
                        return this.getMonomerOnStart(...file.args);
                    } else if (file.type === "PAE") {
                        return this.loadPAE(...file.args);
                    } else {
                        console.log("Unrecognised file type");
                        console.log(file);
                        return Promise.resolve();
                    }
                }),
            );
        } catch (err) {
            console.log("Error fetching files...");
            console.log(err);
        }
    }

    checkIfLoadedData() {
        // No legend is loaded but there is some data loaded so the current message must be the no data message and must be removed
        if (
            this.cachedLegend === null &&
            (this.controls.moorhenInstance.getMoleculeList().length !== 0 ||
                this.controls.moorhenInstance.getMapList().length !== 0)
        ) {
            const domComponent = parse("<div></div>") as React.JSX.Element;
            this.controls.setLegendText(domComponent);
        }
    }

    triggerSceneUpdates() {
        setTimeout(async () => {
            try {
                this.controls.setBusyFetching(true);
                await Promise.all([this.updateMolecules(), this.updateMaps(), this.updateLegend()]);
            } catch (err) {
                console.log("Error fetching files...");
                console.log(err);
            } finally {
                setTimeout(() => this.controls.setBusyFetching(false), 2000);
                this.checkIfLoadedData();
                this.triggerSceneUpdates();
            }
        }, this.updateInterval);
    }

    updateLegend() {
        const legendInputFile = this.inputFiles.find((file) => file.type === "legend") as LegendInputFileType;
        if (typeof legendInputFile !== "undefined") {
            return this.loadLegend(...legendInputFile.args).catch((err) => console.log(err));
        }
        return Promise.resolve();
    }

    updateMolecules() {
        const moleculeInputFiles = this.inputFiles.filter((file) => file.type === "pdb") as PdbInputFileType[];
        return Promise.all(
            moleculeInputFiles.map((inputFile) => {
                const loadedMolecule = this.getLoadedMolecule(inputFile.uniqueId);
                if (typeof loadedMolecule === "undefined") {
                    return this.loadPdbData(inputFile.uniqueId, ...inputFile.args).catch((err) => console.log(err));
                } else {
                    const oldUnitCellParams = JSON.stringify(loadedMolecule.getUnitCellParams());
                    return loadedMolecule
                        .replaceModelWithFile(inputFile.args[0])
                        .then((_) => {
                            const newUnitCellParams = JSON.stringify(loadedMolecule.getUnitCellParams());
                            if (oldUnitCellParams !== newUnitCellParams) {
                                loadedMolecule.centreOn("/*/*/*/*", true);
                            }
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                }
            }),
        );
    }

    updateMaps() {
        const mapInputFiles = this.inputFiles.filter((file) => file.type === "mtz") as MapInputFileType[];
        return Promise.all(
            mapInputFiles.map((inputFile) => {
                const mapIds = this.loadedMapIds[inputFile.uniqueId];
                if (!mapIds) {
                    return this.loadMtzData(inputFile.uniqueId, inputFile.url, inputFile.maps).catch((err) =>
                        console.log(err),
                    );
                }
                return Promise.all(
                    mapIds
                        .map((mapId) => this.controls.moorhenInstance.getMap(mapId))
                        .filter((map) => map)
                        .map((map) =>
                            map.replaceMapWithMtzFile(inputFile.url, map.selectedColumns).catch((err) => console.log(err)),
                        ),
                );
            }),
        );
    }

    waitForInitialisation() {
        const checkCootIsInitialised = (resolve) => {
            if (this.controls) {
                resolve();
            } else {
                setTimeout((_) => checkCootIsInitialised(resolve), 500);
            }
        };
        return new Promise(checkCootIsInitialised);
    }

    renderMoorhen() {
        const rootDiv = document.getElementById(this.rootId);
        const root = ReactDOM.createRoot(rootDiv);
        root.render(
            <React.StrictMode>
                <div className="App">
                    <MoorhenProvider>
                        <MoorhenCloudApp
                            urlPrefix={this.urlPrefix}
                            backupStorageInstance={this.backupStorageInstance}
                            aceDRGInstance={this.aceDRGInstance}
                            forwardControls={this.forwardControls.bind(this)}
                            disableFileUploads={true}
                            exitCallback={this.exit.bind(this)}
                            onChangePreferencesListener={this.onChangePreferencesListener.bind(this)}
                            monomerLibraryPath={this.monomerLibrary}
                            viewOnly={this.workMode === "view"}
                        />
                    </MoorhenProvider>
                </div>
            </React.StrictMode>,
        );
    }

    async start() {
        await this.importPreferences(this.preferences);

        this.renderMoorhen();
        await this.waitForInitialisation();

        if (this.noDataLegendMessage) {
            this.controls.setLegendText(this.noDataLegendMessage);
        }

        await this.loadInputFiles();

        // loadFiles centres on the last molecule it loads, so a saved view has to be applied afterwards
        this.applyView(this.controls.store);

        if (this.updateInterval !== null) {
            this.checkIfLoadedData();
            this.triggerSceneUpdates();
        }
    }

    async getMoleculeData() {
        const molecules = this.controls.moorhenInstance.getMoleculeList();
        let modifiedMolecules: number[];
        // If the head is detached then any molecule may have been modified so lets store all of them...
        if (this.controls.commandCentre.current.history.headIsDetached) {
            modifiedMolecules = molecules.map((molecule) => molecule.molNo);
        } else {
            modifiedMolecules = this.controls.commandCentre.current.history.getModifiedMolNo();
        }
        const selectedMolecules = molecules.filter(
            (molecule) =>
                !molecule.isLigand && (molecule.isMRSearchModel || modifiedMolecules.includes(molecule.molNo)),
        );
        const pdbCoordData = await Promise.all(selectedMolecules.map((molecule) => molecule.getAtoms("pdb")));
        const mmcifCoordData = await Promise.all(selectedMolecules.map((molecule) => molecule.getAtoms("mmcif")));

        return selectedMolecules.map((molecule, index) => {
            return {
                molName: molecule.name,
                pdbData: pdbCoordData[index],
                mmcifData: mmcifCoordData[index],
                isMRSearchModel: molecule.isMRSearchModel,
            };
        });
    }

    getLigData() {
        const ligandData: { [compId: string]: string } = {};
        this.controls.moorhenInstance.getMoleculeList().forEach((molecule) => {
            Object.keys(molecule.ligandDicts).forEach((compId) => {
                if (!Object.keys(ligandData).includes(compId)) {
                    ligandData[compId] = molecule.ligandDicts[compId];
                }
            });
        });
        return Object.values(ligandData);
    }

    async exit() {
        // catches preferences set back to their default, which Moorhen does not report
        await this.exportPreferences().catch((err) => console.log(err));
        const molData = await this.getMoleculeData();
        const ligData = this.getLigData();
        const viewData = this.getViewSettings(this.controls.store);
        this.exitCallback({
            viewData,
            molData,
            ligData,
        });
    }
}
