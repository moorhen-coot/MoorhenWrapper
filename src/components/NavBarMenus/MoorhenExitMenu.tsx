import { useEffect } from "react";

export const MoorhenExitMenu = (props: {
    exitCallback: () => Promise<void>;
}) => {

    useEffect(() => {
        props.exitCallback()
    }, [])

    return <span>Saving...</span>
}