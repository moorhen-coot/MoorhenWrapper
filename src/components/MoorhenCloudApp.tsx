import { useRef, useState, useEffect } from 'react'
import { MoorhenContainer, MoorhenQuerySequenceModal } from "moorhen"
import { MoorhenLegendToast } from './misc/MoorhenLegendToast'
import { MoorhenExitMenu } from "./NavBarMenus/MoorhenExitMenu"
import { MoorhenMrFetchOnlineSources } from "./NavBarMenus/MoorhenMrFetchOnlineSources"
import { MoorhenSliceNDiceModal } from "./modals/MoorhenSliceNDiceModal"
import { moorhen } from "moorhen/types/moorhen"
import { webGL } from "moorhen/types/mgWebGL"
import { CloudDownloadOutlined, ContentCutOutlined, LogoutOutlined, ManageSearchOutlined } from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux';
import { AnyAction, Dispatch } from "@reduxjs/toolkit";

export interface MoorhenCloudControlsInterface {
    setNotifyNewContent: React.Dispatch<React.SetStateAction<boolean>>;
    setLegendText: React.Dispatch<React.SetStateAction<JSX.Element>>;
    setBusyFetching: React.Dispatch<React.SetStateAction<boolean>>;
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    moleculesRef: React.RefObject<moorhen.Molecule[]>;
    mapsRef: React.RefObject<moorhen.Map[]>;
    activeMapRef: React.RefObject<moorhen.Map>;
    dispatch: Dispatch<AnyAction>;
}

interface MoorhenCloudAppPropsInterface extends moorhen.ContainerProps {
    exitCallback: () => Promise<void>;
    onChangePreferencesListener: (key: string, value: any) => void;
    forwardControls: (controls: MoorhenCloudControlsInterface) => void;
    isMrPreparationMode?: boolean;
}

export const MoorhenCloudApp = (props: MoorhenCloudAppPropsInterface) => {
    const glRef = useRef<webGL.MGWebGL | null>(null)
    const timeCapsuleRef = useRef<moorhen.TimeCapsule | null>(null)
    const commandCentre = useRef<moorhen.CommandCentre | null>(null)
    const moleculesRef = useRef<moorhen.Molecule[] | null>(null)
    const mapsRef = useRef<moorhen.Map[] | null>(null)
    const activeMapRef = useRef<moorhen.Map | null>(null)
    const exitDialActionRef = useRef(null)
    const seqSearchDialActionRef = useRef(null)
    const fetchDialActionRef = useRef(null)
    const showSliceNDiceDialActionRef = useRef(null)
    
    const [legendText, setLegendText] = useState<string | JSX.Element>('Loading, please wait...')
    const [busyFetching, setBusyFetching] = useState<boolean>(false)
    const [notifyNewContent, setNotifyNewContent] = useState<boolean>(false)
    const [showMrQuerySequenceModal, setShowMrQuerySequenceModal] = useState<boolean>(false)
    const [showSliceNDiceModal, setShowSliceNDiceModal] = useState<boolean>(false)

    const dispatch = useDispatch()
    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized)

    let includeNavBarMenuNames = []
    let extraNavBarMenus = []
    let extraNavBarModals = []
    
    if (props.isMrPreparationMode) {
        includeNavBarMenuNames = ["Fetch coords", "Seq. search", "Slice-n-Dice", "Models", "View", "Preferences", "Help", "Exit"]
        extraNavBarMenus.push({
            icon: <CloudDownloadOutlined/>,
            name: 'Fetch coords',
            ref: fetchDialActionRef,
            JSXElement: <MoorhenMrFetchOnlineSources
                            commandCentre={commandCentre}
                            glRef={glRef}
                            monomerLibraryPath={props.monomerLibraryPath}
                        />
        })
        extraNavBarModals.push(
            {
                icon: <ManageSearchOutlined/>,
                name: 'Seq. search',
                ref: seqSearchDialActionRef,
                show: showMrQuerySequenceModal,
                setShow: setShowMrQuerySequenceModal,
                JSXElement: <MoorhenQuerySequenceModal
                                key={'mr-seq-search'}
                                show={showMrQuerySequenceModal}
                                setShow={setShowMrQuerySequenceModal}
                                commandCentre={commandCentre}
                                glRef={glRef}
                                monomerLibraryPath={props.monomerLibraryPath}
                            />    
            }, 
            {
                icon: <ContentCutOutlined/>,
                name: 'Slice-n-Dice',
                ref: showSliceNDiceDialActionRef,
                show: showSliceNDiceModal,
                setShow: setShowSliceNDiceModal,
                JSXElement: <MoorhenSliceNDiceModal
                                key={'slice-n-dice-modal'}
                                show={showSliceNDiceModal}
                                setShow={setShowSliceNDiceModal}
                            />    
            }, 
        )
    }
    
    extraNavBarMenus.push({
        icon: <LogoutOutlined/>,
        name: 'Exit',
        ref: exitDialActionRef,
        JSXElement: <MoorhenExitMenu exitCallback={props.exitCallback}/>
    })

    const collectedProps = {
        ...props, glRef, commandCentre, timeCapsuleRef, moleculesRef, mapsRef, activeMapRef
    }

    useEffect(() => {
        if (cootInitialized) {
            let collectedControls = {
                setLegendText, setBusyFetching, setNotifyNewContent, glRef, commandCentre, 
                timeCapsuleRef, moleculesRef, mapsRef, activeMapRef, dispatch
            }
            props.forwardControls(collectedControls)
        }        
    }, [cootInitialized]) 

    return <>
            <MoorhenContainer
                {...collectedProps}
                onUserPreferencesChange={props.onChangePreferencesListener}
                allowScripting={false}
                includeNavBarMenuNames={includeNavBarMenuNames}
                extraNavBarMenus={extraNavBarMenus}
                extraNavBarModals={extraNavBarModals}
                />
            {props.viewOnly && 
            <MoorhenLegendToast busyFetching={busyFetching} notifyNewContent={notifyNewContent} legendText={legendText}/>}
        </>

}

MoorhenCloudApp.defaultProps = {  isMrPreparationMode: false }