import React from "react";
import { useRef, useState, useEffect } from "react";
import {
    MainMenuEntryJSX,
    MoorhenContainer,
    MoorhenReduxStoreType,
    MoorhenStoreRootState,
    useCommandCentre,
} from "moorhen";
import { MoorhenMolecule, MoorhenMap, CommandCentre, MoorhenTimeCapsule, useMoorhenInstance } from "moorhen";
import Moorhen from "moorhen";
import { MoorhenLegendToast } from "./misc/MoorhenLegendToast";
import { MoorhenExitMenu } from "./NavBarMenus/MoorhenExitMenu";
import { moorhen } from "moorhen/types/moorhen";
import { webGL } from "moorhen/types/mgWebGL";
import { LogoutOutlined } from "@mui/icons-material";
import { useDispatch, useSelector, useStore } from "react-redux";
import { AnyAction, Dispatch } from "@reduxjs/toolkit";
import { CloudStorageInstanceInterface } from "../utils/MoorhenCloudTimeCapsule";
import type { EnhancedStore, Store } from "@reduxjs/toolkit";

export type MoorhenCloudControls = {
    setNotifyNewContent: React.Dispatch<React.SetStateAction<boolean>>;
    setLegendText: React.Dispatch<React.SetStateAction<React.JSX.Element>>;
    setBusyFetching: React.Dispatch<React.SetStateAction<boolean>>;
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<CommandCentre>;
    timeCapsuleRef: React.RefObject<MoorhenTimeCapsule>;
    moleculesRef: React.RefObject<MoorhenMolecule[]>;
    mapsRef: React.RefObject<MoorhenMap[]>;
    activeMapRef: React.RefObject<MoorhenMap>;
    dispatch: Dispatch<AnyAction>;
    store: Store<MoorhenStoreRootState>;
};

interface MoorhenCloudAppPropsInterface {
    exitCallback: () => Promise<void>;
    onChangePreferencesListener: (key: string, value: any) => void;
    forwardControls: (controls: MoorhenCloudControls) => void;
    backupStorageInstance: CloudStorageInstanceInterface;
    aceDRGInstance: moorhen.AceDRGInstance;
    disableFileUploads: boolean;
    monomerLibraryPath: string;
    viewOnly?: boolean;
    urlPrefix?: string;
    // Add all properties from ContainerProps here if needed, or use intersection type if compatible
    [key: string]: any;
}

export const MoorhenCloudApp = (props: MoorhenCloudAppPropsInterface) => {
    const glRef = useRef<webGL.MGWebGL | null>(null);
    const timeCapsuleRef = useRef<Moorhen.MoorhenTimeCapsule | null>(null);
    // const commandCentre = useRef<moorhen.CommandCentre | null>(null);
    const moleculesRef = useRef<MoorhenMolecule[] | null>(null);
    const mapsRef = useRef<moorhen.Map[] | null>(null);
    const activeMapRef = useRef<moorhen.Map | null>(null);
    const commandCentre = useCommandCentre();
    const store = useStore<MoorhenStoreRootState>();
    const moorhenInstance = useMoorhenInstance();

    const [legendText, setLegendText] = useState<string | React.JSX.Element>("Loading, please wait...");
    const [busyFetching, setBusyFetching] = useState<boolean>(false);
    const [notifyNewContent, setNotifyNewContent] = useState<boolean>(false);

    const dispatch = useDispatch();
    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized);

    const collectedProps = {
        ...props,
        glRef,
        commandCentre,
        timeCapsuleRef,
        moleculesRef,
        mapsRef,
        activeMapRef,
    };

    const extraMainMenu: MainMenuEntryJSX = {
        type: "jsx",
        label: "Exit",
        component: <MoorhenExitMenu key={"exit"} exitCallback={props.exitCallback} />,
        icon: "MatSymLogout",
    };
    const onInitialisationCompletedCallback = async () => {
        moorhenInstance.getMenuSystem().addMainMenu(extraMainMenu);
    };

    useEffect(() => {
        if (cootInitialized) {
            props.forwardControls({
                setLegendText,
                setBusyFetching,
                setNotifyNewContent,
                glRef,
                commandCentre,
                timeCapsuleRef,
                moleculesRef,
                mapsRef,
                activeMapRef,
                dispatch,
                store,
            });
        }
    }, [cootInitialized]);

    return (
        <>
            <MoorhenContainer
                {...collectedProps}
                onUserPreferencesChange={props.onChangePreferencesListener}
                allowScripting={false}
                onInitialisationCompleted={onInitialisationCompletedCallback}
            />
            {props.viewOnly && (
                <MoorhenLegendToast
                    busyFetching={busyFetching}
                    notifyNewContent={notifyNewContent}
                    legendText={legendText}
                />
            )}
        </>
    );
};
