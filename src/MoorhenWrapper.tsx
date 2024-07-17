import React from 'react';
import ReactDOM from 'react-dom/client';
import { MoorhenCloudApp, MoorhenCloudControlsInterface } from './components/MoorhenCloudApp';
import { CloudBackupInterface, CloudStorageInstance, CloudStorageInstanceInterface } from "./utils/MoorhenCloudTimeCapsule"
import { MoorhenMap, MoorhenMolecule, MoorhenPreferences, addMap, setActiveMap, addMolecule, setMapColours, setNegativeMapColours, setPositiveMapColours, MoorhenReduxStore } from "moorhen"
import { guid } from "./utils/utils"
import { MoorhenAceDRGInstance } from "./utils/MoorhenAceDRGInstance";
import reportWebVitals from './reportWebVitals'
import parse from 'html-react-parser';
import { moorhen } from "moorhen/types/moorhen";
import { libcootApi } from "moorhen/types/libcoot";
import { Provider } from 'react-redux';

declare var createCCP4Module: (arg0: any) => Promise<libcootApi.CCP4ModuleType>;

const createModule = () => {
  createCCP4Module({
    print(t) { console.log(["output", t]) },
    printErr(t) { console.log(["output", t]); }
  })
  .then(function (CCP4Mod) {
    // @ts-ignore
    window.CCP4Module = CCP4Mod;
  })
  .catch((e) => {
    console.log("CCP4 problem :(");
    console.log(e);
  });
}

type PdbInputFileType = {
  type: 'pdb';
  uniqueId?: string;
  args: [string, string];
}

type MapInputFileType = {
  type: 'mtz';
  uniqueId?: string;
  args: [string, string, moorhen.selectedMtzColumns, boolean?, { [type: string]: {r: number, g: number, b: number} }?];
}

type LegendInputFileType = {
  type: 'legend';
  uniqueId?: string;
  args: [string];
}

type LigandInputFileType = {
  type: 'ligand';
  uniqueId?: string;
  args: [string, string[]];
}

export default class MoorhenWrapper {
  urlPrefix: string;
  monomerLibrary: string;
  controls: MoorhenCloudControlsInterface;
  updateInterval: number;
  workMode: "build" | "view" | "view-update" | "mr-prep";
  inputFiles: (PdbInputFileType | MapInputFileType | LegendInputFileType | LigandInputFileType)[]
  rootId: string;
  preferences: moorhen.PreferencesValues;
  cachedPreferences: moorhen.PreferencesValues;
  cachedLegend: string;
  cachedLigandDictionaries: string[];
  noDataLegendMessage: JSX.Element;
  exitCallback: (arg0: {
    viewData: moorhen.viewDataSession;
    molData: { molName: string; pdbData: string; mmcifData: string }[];
    ligData: string[]
  }) => Promise<void>;
  exportPreferencesCallback: (arg0: moorhen.PreferencesValues) => void;
  backupStorageInstance: CloudStorageInstanceInterface;
  aceDRGInstance: moorhen.AceDRGInstance;
  viewSettings: moorhen.viewDataSession;

  constructor(urlPrefix: string) {
    this.urlPrefix = urlPrefix
    this.monomerLibrary = `${this.urlPrefix}/baby-gru/monomers/`
    this.controls = null
    this.updateInterval = null
    this.workMode = 'build'
    this.inputFiles = null
    this.rootId = null
    this.preferences = null
    this.cachedPreferences = null
    this.cachedLegend = null
    this.cachedLigandDictionaries = []
    this.noDataLegendMessage = parse('<div></div>') as JSX.Element
    this.exitCallback = async () => {}
    this.exportPreferencesCallback = () => {}
    this.backupStorageInstance = new CloudStorageInstance()
    this.aceDRGInstance = new MoorhenAceDRGInstance()
    this.viewSettings = null
    reportWebVitals()
    createModule()
  }

  setViewSettings(newSettings: moorhen.viewDataSession) {
    this.viewSettings = newSettings
  }

  getViewSettings() {
    const viewData: moorhen.viewDataSession = {
      origin: this.controls.glRef.current.origin,
      backgroundColor: this.controls.glRef.current.background_colour,
      ambientLight: this.controls.glRef.current.light_colours_ambient,
      diffuseLight: this.controls.glRef.current.light_colours_diffuse,
      lightPosition: this.controls.glRef.current.light_positions,
      specularLight: this.controls.glRef.current.light_colours_specular,
      fogStart: this.controls.glRef.current.gl_fog_start,
      fogEnd: this.controls.glRef.current.gl_fog_end,
      zoom: this.controls.glRef.current.zoom,
      doDrawClickedAtomLines: this.controls.glRef.current.doDrawClickedAtomLines,
      clipStart: (this.controls.glRef.current.gl_clipPlane0[3] + this.controls.glRef.current.fogClipOffset) * -1,
      clipEnd: this.controls.glRef.current.gl_clipPlane1[3] - this.controls.glRef.current.fogClipOffset,
      specularPower: this.controls.glRef.current.specularPower,
      quat4: this.controls.glRef.current.myQuat,
      doPerspectiveProjection: this.controls.glRef.current.doPerspectiveProjection,
      edgeDetection: {
          enabled: this.controls.glRef.current.doEdgeDetect,
          depthScale: this.controls.glRef.current.scaleDepth,
          depthThreshold: this.controls.glRef.current.depthThreshold,
          normalScale: this.controls.glRef.current.scaleNormal,
          normalThreshold: this.controls.glRef.current.normalThreshold
      },
      shadows: this.controls.glRef.current.doShadow,
      ssao: {
          enabled: this.controls.glRef.current.doSSAO,
          radius: this.controls.glRef.current.ssaoRadius,
          bias: this.controls.glRef.current.ssaoBias
      },
      blur: {
          enabled: this.controls.glRef.current.useOffScreenBuffers,
          radius: this.controls.glRef.current.blurSize,
          depth: this.controls.glRef.current.blurDepth
      }
    }
    return viewData
  }

  setAceDRGMakeLinkCallback(functionCallback: (arg0: moorhen.createCovLinkAtomInput, arg1: moorhen.createCovLinkAtomInput) => void) {
    this.aceDRGInstance.createCovalentLink = functionCallback
  }

  setBackupSaveListener(functionCallback: (arg0: CloudBackupInterface) => Promise<string | void>) {
    this.backupStorageInstance.exportBackupCallback = functionCallback
  }

  setBackupLoadListener(functionCallback: (arg0: string | number) => Promise<CloudBackupInterface | void>) {
    this.backupStorageInstance.importBackupCallback = functionCallback
  }

  setRemoveBackupListener(functionCallback: (arg: string | number) => Promise<void>) {
    this.backupStorageInstance.removeBackupCallback = functionCallback
  }

  setBackupListLoadListener(functionCallback: () => Promise<CloudBackupInterface[]>) {
    this.backupStorageInstance.loadBackupList = functionCallback
  }

  setWorkMode(mode: "build" | "view" | "view-update" = 'build') {
    if (['build', 'view', 'view-update'].includes(mode)) {
      this.workMode = mode
    } else {
      console.error(`Unrecognised working mode set in moorhen ${mode}`)
    } 
  }

  setNoDataLegendMessage(htmlString: string) {
    try {
      this.noDataLegendMessage = parse(htmlString) as JSX.Element
    } catch (err) {
      console.log('Unable to parse legend html string')
      console.log(err)
    }
  }

  setPreferences(preferences: moorhen.PreferencesValues) {
    this.preferences = preferences
  }

  setRootId(rootId: string) {
    this.rootId = rootId
  }

  setInputFiles(inputFiles: (PdbInputFileType | MapInputFileType | LegendInputFileType | LigandInputFileType)[]) {
    this.inputFiles = inputFiles.map(inputFile => {
      return {uniqueId: guid(), ...inputFile}
    })
  }

  setUpdateInterval(miliseconds: number) {
    this.updateInterval = miliseconds
  }

  setMonomerLibrary(uri: string) {
    this.monomerLibrary = uri
  }

  addOnExitListener(callbackFunction: (arg0: { viewData: moorhen.viewDataSession; molData: { molName: string; pdbData: string; mmcifData: string }[]; ligData: string[]; }) => Promise<void>) {
    this.exitCallback = callbackFunction
  }

  addOnChangePreferencesListener(callbackFunction: (arg0: moorhen.PreferencesValues) => void) {
    this.exportPreferencesCallback = callbackFunction
  }

  onChangePreferencesListener(key: string, value: any): void {
    switch (key) {
      
      case 'defaultBackgroundColor':
      case 'defaultUpdatingScores':
        if (JSON.stringify(this.cachedPreferences[key]) !== JSON.stringify(value)) {
          this.cachedPreferences[key] = value
          this.exportPreferencesCallback(this.cachedPreferences)    
        }
        break
      
      case 'shortCuts':
        if (JSON.stringify(this.cachedPreferences[key]) !== value) {
          this.cachedPreferences[key] = JSON.parse(value)
          this.exportPreferencesCallback(this.cachedPreferences)
        }
        break
      
      default:
        if (this.cachedPreferences[key] !== value) {
          this.cachedPreferences[key] = value
          this.exportPreferencesCallback(this.cachedPreferences)
        }
        break
    }
  }

  forwardControls(controls: MoorhenCloudControlsInterface) {
    console.log('Fetched controls', {controls})
    this.controls = controls
  }

  async importPreferences(incomingPreferences: moorhen.PreferencesValues) {
    const defaultPreferences = MoorhenPreferences.defaultPreferencesValues
    let preferences: moorhen.PreferencesValues
    
    if (incomingPreferences.version === defaultPreferences.version) {
      preferences = incomingPreferences
    } else {
      preferences = defaultPreferences
    }

    const moorhenPreferences = new MoorhenPreferences()
    await Promise.all(Object.keys(preferences).map(key => {
        if (key === 'shortCuts') {
          return moorhenPreferences.localStorageInstance.setItem(key, JSON.stringify(preferences[key]))
        } else {
          return moorhenPreferences.localStorageInstance.setItem(key, preferences[key])
        }
    }))

    this.cachedPreferences = preferences
  }

  addStyleSheet(uri: string) {
    const head = document.head;
    const style: any = document.createElement("link");
    style.href = uri
    style.rel = "stylesheet";
    style.async = true
    style.type = 'text/css'
    head.appendChild(style);
  }

  async canFetchFile(url: string, timeout: number = 3000) {
    const timeoutSignal = AbortSignal.timeout(timeout)
    try {
      const response = await fetch(url, {method: 'HEAD', signal: timeoutSignal})
      if (response.ok) {
        return true
      } else {
        return false
      }
    } catch (err) {
      console.log(err)
      return false
    }
  }

  applyView() {
    if (this.viewSettings) {
      this.controls.glRef.current.setAmbientLightNoUpdate(...Object.values(this.viewSettings.ambientLight) as [number, number, number])
      this.controls.glRef.current.setSpecularLightNoUpdate(...Object.values(this.viewSettings.specularLight) as [number, number, number])
      this.controls.glRef.current.setDiffuseLightNoUpdate(...Object.values(this.viewSettings.diffuseLight) as [number, number, number])
      this.controls.glRef.current.setLightPositionNoUpdate(...Object.values(this.viewSettings.lightPosition) as [number, number, number])
      this.controls.glRef.current.setZoom(this.viewSettings.zoom, false)
      this.controls.glRef.current.set_fog_range(this.viewSettings.fogStart, this.viewSettings.fogEnd, false)
      this.controls.glRef.current.set_clip_range(this.viewSettings.clipStart, this.viewSettings.clipEnd, false)
      this.controls.glRef.current.doDrawClickedAtomLines = this.viewSettings.doDrawClickedAtomLines
      this.controls.glRef.current.background_colour = this.viewSettings.backgroundColor
      this.controls.glRef.current.setQuat(this.viewSettings.quat4)
      this.controls.glRef.current.setOriginAnimated(this.viewSettings.origin)
    }
  }

  async loadMtzData(uniqueId: string, inputFile: string, mapName: string, selectedColumns: moorhen.selectedMtzColumns, isVisible: boolean = true, colour?: {[type: string]: {r: number, g: number, b: number}}): Promise<moorhen.Map> {
    const newMap = new MoorhenMap(this.controls.commandCentre, this.controls.glRef, MoorhenReduxStore)
    newMap.uniqueId = uniqueId
    
    return new Promise(async (resolve, reject) => {
      try {
        await newMap.loadToCootFromMtzURL(inputFile, mapName, selectedColumns)
        newMap.showOnLoad = isVisible
        if (colour) {
          if (colour.mapColour) {
            this.controls.dispatch( setMapColours({molNo: newMap.molNo, rgb: colour.mapColour}) )
          }
          if (colour.negativeDiffColour) {
            this.controls.dispatch( setNegativeMapColours({molNo: newMap.molNo, rgb: colour.negativeDiffColour}) )
          }
          if (colour.positiveDiffColour) {
            this.controls.dispatch( setPositiveMapColours({molNo: newMap.molNo, rgb: colour.positiveDiffColour}) )
          }
        }    
        this.controls.dispatch( addMap(newMap) )
        this.controls.dispatch( setActiveMap(newMap) )
        return resolve(newMap)
      
      } catch (err) {
        console.log(`Cannot fetch mtz from ${inputFile}`)
        return reject(err)
      }
    
    })  
  }

  async loadPdbData(uniqueId: string, inputFile: string, molName: string): Promise<moorhen.Molecule> {
    const newMolecule = new MoorhenMolecule(this.controls.commandCentre, this.controls.glRef, MoorhenReduxStore, this.monomerLibrary) as moorhen.Molecule

    return new Promise(async (resolve, reject) => {
      try {
        newMolecule.uniqueId = uniqueId
        this.cachedLigandDictionaries.forEach(ligandDict => ligandDict && newMolecule.cacheLigandDict(ligandDict))
        newMolecule.setBackgroundColour(this.controls.glRef.current.background_colour)
        await newMolecule.loadToCootFromURL(inputFile, molName)
        await newMolecule.fetchIfDirtyAndDraw(newMolecule.atomCount >= 50000 ? 'CRs' : 'CBs')
        this.controls.dispatch( addMolecule(newMolecule) )
        if (!this.viewSettings) {
          await newMolecule.centreOn()
        }
        return resolve(newMolecule)
      } catch (err) {
        console.log(`Cannot fetch molecule from ${inputFile}`)
        return reject(err)
      }
    })
  }

  async getMonomerOnStart(url: string, ligandNames: string[]) {
    await Promise.all(
      ligandNames.map(async (ligandName) => {
        const getMonomerResult = await this.controls.commandCentre.current.cootCommand({
          returnType: 'status',
          command: 'get_monomer_and_position_at',
          commandArgs: [ligandName, -999999, 0, 0, 0]
        }, true)
        if (getMonomerResult.data.result.status === "Completed" && getMonomerResult.data.result.result !== -1) {
          const newMolecule = new MoorhenMolecule(this.controls.commandCentre, this.controls.glRef, MoorhenReduxStore, this.monomerLibrary) as unknown as moorhen.Molecule
          newMolecule.molNo = getMonomerResult.data.result.result
          newMolecule.name = ligandName
          newMolecule.setBackgroundColour(this.controls.glRef.current.background_colour)
          this.cachedLigandDictionaries.forEach(ligandDict => ligandDict && newMolecule.cacheLigandDict(ligandDict))
          await newMolecule.fetchIfDirtyAndDraw('CBs')
          this.controls.dispatch( addMolecule(newMolecule) )
        } else {
          console.log('Error getting monomer... Missing dictionary?')
        }
      })
    )
  }

  async loadLigandData(url: string, ligandNames: string[]): Promise<string> {
    try {
      const response = await fetch(url)
      if (response.ok) {
        const fileContents = await response.text()
        await this.controls.commandCentre.current.cootCommand({
          returnType: "status",
          command: 'read_dictionary_string',
          commandArgs: [fileContents, -999999],
          changesMolecules: []
        }, true)
        return fileContents
      } else {
        console.log(`Unable to fetch legend file ${url}`)
      }
    } catch (err) {
      console.log(err)
    }
  }

  async loadLegend(url: string): Promise<void> {
    try {
      const response = await fetch(url)
      if (response.ok) {
        const fileContents = await response.text()
        if (fileContents !== this.cachedLegend) {
          this.controls.setNotifyNewContent(true)
          const domComponent = parse(fileContents) as JSX.Element
          this.controls.setLegendText(domComponent)
          this.cachedLegend = fileContents
          setTimeout(() => this.controls.setNotifyNewContent(false), 4000)
        }
      } else {
        console.log(`Unable to fetch legend file ${url}`)
      }
    } catch (err) {
      console.log(err)
    }
  }

  async loadInputFiles(): Promise<void>{

    this.cachedLigandDictionaries = await Promise.all(
      this.inputFiles.filter(file => file.type === 'ligand').map(file => this.loadLigandData(...file.args as [string, string[]]))
    )

    try {
      await Promise.all(
        this.inputFiles.map(file => {
          if (file.type === 'pdb') {
            return this.loadPdbData(file.uniqueId, ...file.args)
          } else if (file.type === 'mtz') {
            return this.loadMtzData(file.uniqueId, ...file.args)
          } else if (file.type === 'legend') {
            return this.loadLegend(...file.args)
          } else if (file.type === 'ligand') {
            return this.getMonomerOnStart(...file.args)
          } else {
            console.log('Unrecognised file type')
            console.log(file)
            return Promise.resolve()
          }
      }))  
    } catch (err) {
      console.log('Error fetching files...')
      console.log(err)
    }
  }

  checkIfLoadedData() {
    // No legend is loaded but there is some data loaded so the current message must be the no data message and must be removed
    if (this.cachedLegend === null && (this.controls.moleculesRef.current.length !== 0 || this.controls.mapsRef.current.length !== 0)) {
      const domComponent = parse('<div></div>') as JSX.Element
      this.controls.setLegendText(domComponent)
    }
  }

  triggerSceneUpdates() {
    setTimeout(async () => {
      try {
        this.controls.setBusyFetching(true)
        await Promise.all([
          this.updateMolecules(),
          this.updateMaps(),
          this.updateLegend(),
        ])
      }
      catch (err) {
        console.log('Error fetching files...')
        console.log(err)  
      } finally {
        setTimeout(() => this.controls.setBusyFetching(false), 2000)
        this.checkIfLoadedData()
        this.triggerSceneUpdates()
      } 
    }, this.updateInterval)
  }

  updateLegend(){
    const legendInputFile = this.inputFiles.find(file => file.type === 'legend') as LegendInputFileType
    if (typeof legendInputFile !== 'undefined') {
      return this.loadLegend(...legendInputFile.args).catch((err) => console.log(err))
    }
    return Promise.resolve()
  }

  updateMolecules() {
    const moleculeInputFiles = this.inputFiles.filter(file => file.type === 'pdb') as PdbInputFileType[]
    return Promise.all(moleculeInputFiles.map(inputFile => {
      const loadedMolecule = this.controls.moleculesRef.current.find(molecule => molecule.uniqueId === inputFile.uniqueId)
      if (typeof loadedMolecule === 'undefined') {
        return this.loadPdbData(inputFile.uniqueId, ...inputFile.args).catch((err) => console.log(err))
      } else {
        const oldUnitCellParams = JSON.stringify(loadedMolecule.getUnitCellParams())
        return loadedMolecule.replaceModelWithFile(inputFile.args[0])
          .then(_ => {
            const newUnitCellParams = JSON.stringify(loadedMolecule.getUnitCellParams())
            if (oldUnitCellParams !== newUnitCellParams) {
              loadedMolecule.centreOn('/*/*/*/*', true)
            }   
          })
          .catch((err) => {
            console.log(err)
          })
      }
    }))
  }
  
  updateMaps() {
    const mapInputFiles = this.inputFiles.filter(file => file.type === 'mtz') as MapInputFileType[]
    return Promise.all(mapInputFiles.map(inputFile => {
      const loadedMap = this.controls.mapsRef.current.find(map => map.uniqueId === inputFile.uniqueId)
      if (typeof loadedMap === 'undefined') {
        return this.loadMtzData(inputFile.uniqueId, ...inputFile.args).catch((err) => console.log(err))
      } else {
        return loadedMap.replaceMapWithMtzFile(inputFile.args[0], inputFile.args[2]).catch((err) => console.log(err))
      }
    }))
  }

  waitForInitialisation() {
    const checkCootIsInitialised = resolve => {
      if (this.controls) {
        resolve()
      } else {
        setTimeout(_ => checkCootIsInitialised(resolve), 500);
      }  
    }
    return new Promise(checkCootIsInitialised)
  }

  renderMoorhen() {
    const rootDiv = document.getElementById(this.rootId)
    const root = ReactDOM.createRoot(rootDiv)
    root.render(
      <React.StrictMode>
        <div className="App">
          <Provider store={MoorhenReduxStore}>
            <MoorhenCloudApp 
              urlPrefix={this.urlPrefix}
              backupStorageInstance={this.backupStorageInstance}
              aceDRGInstance={this.aceDRGInstance}
              forwardControls={this.forwardControls.bind(this)}
              disableFileUploads={true}
              exitCallback={this.exit.bind(this)}
              onChangePreferencesListener={this.onChangePreferencesListener.bind(this)}
              monomerLibraryPath={this.monomerLibrary}
              viewOnly={this.workMode === 'view'}
              />
          </Provider>
        </div>
      </React.StrictMode>
    );
  }

  async start() {
    if (!this.preferences) {
      this.preferences = MoorhenPreferences.defaultPreferencesValues
    }
    await this.importPreferences(this.preferences)

    this.renderMoorhen()
    await this.waitForInitialisation()

    if (this.noDataLegendMessage) {
      this.controls.setLegendText(this.noDataLegendMessage)
    }

    this.applyView()

    await this.loadInputFiles()

    if (this.updateInterval !== null) {
      this.checkIfLoadedData()
      this.triggerSceneUpdates()
    }

  }

  async getMoleculeData() {
    let modifiedMolecules: number[]
    // If the head is detached then any molecule may have been modified so lets store all of them...
    if (this.controls.commandCentre.current.history.headIsDetached) {
      modifiedMolecules = this.controls.moleculesRef.current.map(molecule => molecule.molNo)
    } else {
      modifiedMolecules = this.controls.commandCentre.current.history.getModifiedMolNo()
    }
    const selectedMolecules = this.controls.moleculesRef.current.filter(molecule => !molecule.isLigand && (molecule.isMRSearchModel || modifiedMolecules.includes(molecule.molNo)))
    const pdbCoordData = await Promise.all(selectedMolecules.map(molecule => molecule.getAtoms("pdb")))
    const mmcifCoordData = await Promise.all(selectedMolecules.map(molecule => molecule.getAtoms("mmcif")))

    return selectedMolecules.map((molecule, index) => {
        return {
          molName: molecule.name,
          pdbData: pdbCoordData[index],
          mmcifData: mmcifCoordData[index],
          isMRSearchModel: molecule.isMRSearchModel
        }
    })
  }

  getLigData() {
    const ligandData: {[compId: string]: string} = {}
    this.controls.moleculesRef.current.forEach(molecule => {
      Object.keys(molecule.ligandDicts).forEach(compId => {
        if (!Object.keys(ligandData).includes(compId)) {
          ligandData[compId] = molecule.ligandDicts[compId]
        }
      })
    })
    return Object.values(ligandData)
  }

  async exit() {
    const molData = await this.getMoleculeData()
    const ligData = this.getLigData()
    const viewData = this.getViewSettings()
    this.exitCallback({
      viewData, molData, ligData
    })
  }
}


