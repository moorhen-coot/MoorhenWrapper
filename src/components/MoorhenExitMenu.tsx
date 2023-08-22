import { useEffect } from "react";
import { moorhen } from "moorhen/types/moorhen";
import { webGL } from "moorhen/types/mgWebGL";

export const MoorhenExitMenu = (props: {
    molecules: moorhen.Molecule[];
    glRef: React.RefObject<webGL.MGWebGL>;
    exitCallback: () => Promise<void>;
}) => {

    useEffect(() => {
        props.exitCallback()
    }, [])

    return <span>Saving...</span>
}