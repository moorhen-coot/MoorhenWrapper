import React from "react";
import { useRef, useState, useEffect } from "react";
import { MoorhenContainer, RootState, useCommandCentre } from "moorhen/react-lib";
import type { MainMenuEntryJSX } from "moorhen/types/src/components/menu-system/mainMenuConfig.d.ts";
import { CommandCentre, MoorhenInstance, MoorhenTimeCapsule, useMoorhenInstance } from "moorhen/react-lib";
import { MoorhenLegendToast } from "./misc/MoorhenLegendToast";
import { MoorhenExitMenu } from "./NavBarMenus/MoorhenExitMenu";
import type { moorhen } from "moorhen/types/moorhen.d.ts";
import { useDispatch, useSelector, useStore } from "react-redux";
import { AnyAction, Dispatch } from "@reduxjs/toolkit";
import { CloudStorageInstanceInterface } from "../utils/MoorhenCloudTimeCapsule";
import type { Store } from "@reduxjs/toolkit";

export type MoorhenCloudControls = {
    setNotifyNewContent: React.Dispatch<React.SetStateAction<boolean>>;
    setLegendText: React.Dispatch<React.SetStateAction<string | React.JSX.Element>>;
    setBusyFetching: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<CommandCentre>;
    timeCapsuleRef: React.RefObject<MoorhenTimeCapsule | null>;
    moorhenInstance: MoorhenInstance;
    dispatch: Dispatch<AnyAction>;
    store: Store<RootState>;
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
    const timeCapsuleRef = useRef<MoorhenTimeCapsule | null>(null);
    const commandCentre = useCommandCentre();
    const store = useStore<RootState>();
    const moorhenInstance = useMoorhenInstance();

    const [legendText, setLegendText] = useState<string | React.JSX.Element>("Loading, please wait...");
    const [busyFetching, setBusyFetching] = useState<boolean>(false);
    const [notifyNewContent, setNotifyNewContent] = useState<boolean>(false);

    const dispatch = useDispatch();
    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized);

    const collectedProps = {
        ...props,
        commandCentre,
        timeCapsuleRef,
    };

    const extraMainMenu: MainMenuEntryJSX = {
        type: "jsx",
        label: "Exit",
        component: <MoorhenExitMenu key={"exit"} exitCallback={props.exitCallback} />,
        icon: "MatSymLogout",
    };
    // MoorhenContainer calls onInitialisationCompleted more than once (StrictMode double mount, and
    // before the preferences are restored), so only add the Exit menu the first time
    const exitMenuAdded = useRef<boolean>(false);
    const onInitialisationCompletedCallback = async () => {
        if (exitMenuAdded.current || !moorhenInstance.menuSystem) {
            return;
        }
        moorhenInstance.menuSystem.addMainMenu(extraMainMenu);
        exitMenuAdded.current = true;
    };

    useEffect(() => {
        if (cootInitialized) {
            props.forwardControls({
                setLegendText,
                setBusyFetching,
                setNotifyNewContent,
                commandCentre,
                timeCapsuleRef,
                moorhenInstance,
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
