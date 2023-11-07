import { useRef, useState, useEffect } from 'react'
import { MoorhenContainer } from "moorhen"
import { MoorhenLegendToast } from './misc/MoorhenLegendToast'
import { MoorhenExitMenu } from "./NavBarMenus/MoorhenExitMenu"
import { moorhen } from "moorhen/types/moorhen"
import { webGL } from "moorhen/types/mgWebGL"
import { LogoutOutlined } from '@mui/icons-material'
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
    molecules: moorhen.Molecule[];
    dispatch: Dispatch<AnyAction>;
}

interface MoorhenCloudAppPropsInterface extends moorhen.ContainerProps {
    exitCallback: () => Promise<void>;
    onChangePreferencesListener: (key: string, value: any) => void;
    forwardControls: (controls: MoorhenCloudControlsInterface) => void;
}

export const MoorhenCloudApp = (props: MoorhenCloudAppPropsInterface) => {
    const glRef = useRef<webGL.MGWebGL | null>(null)
    const timeCapsuleRef = useRef<moorhen.TimeCapsule | null>(null)
    const commandCentre = useRef<moorhen.CommandCentre | null>(null)
    const moleculesRef = useRef<moorhen.Molecule[] | null>(null)
    const mapsRef = useRef<moorhen.Map[] | null>(null)
    const activeMapRef = useRef<moorhen.Map | null>(null)
    const exitDialActionRef = useRef(null)
    
    const [legendText, setLegendText] = useState<string | JSX.Element>('Loading, please wait...')
    const [busyFetching, setBusyFetching] = useState<boolean>(false)
    const [notifyNewContent, setNotifyNewContent] = useState<boolean>(false)

    const dispatch = useDispatch()
    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized)
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const backgroundColor = useSelector((state: moorhen.State) => state.canvasStates.backgroundColor)
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const exitMenu = {
        icon: <LogoutOutlined/>,
        name: 'Exit',
        ref: exitDialActionRef,
        JSXElement: <MoorhenExitMenu molecules={molecules as moorhen.Molecule[]} exitCallback={props.exitCallback} glRef={glRef}/>
    }

    const collectedProps = {
        ...props, glRef, commandCentre, timeCapsuleRef, moleculesRef, mapsRef, activeMapRef
    }

    useEffect(() => {
        if (cootInitialized) {
            let collectedControls = {
                setLegendText, setBusyFetching, setNotifyNewContent, glRef, commandCentre, 
                timeCapsuleRef, moleculesRef, mapsRef, activeMapRef, molecules, dispatch
            }
            props.forwardControls(collectedControls)
        }        
    }, [cootInitialized]) 

    return <>
            <MoorhenContainer
                {...collectedProps}
                onUserPreferencesChange={props.onChangePreferencesListener}
                allowScripting={false}
                extraNavBarMenus={[exitMenu]}
                />
            {props.viewOnly && 
            <MoorhenLegendToast backgroundColor={backgroundColor} hoveredAtom={hoveredAtom} busyFetching={busyFetching} notifyNewContent={notifyNewContent} legendText={legendText}/>
            }
        </>

}
