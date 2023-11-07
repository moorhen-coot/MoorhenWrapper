import { useSelector } from 'react-redux';
import { MoorhenFetchOnlineSourcesForm } from "moorhen";
import { convertViewtoPx } from "../../utils/utils"
import { moorhen } from "moorhen/types/moorhen";
import { webGL } from 'moorhen/types/mgWebGL';

export const MoorhenMrFetchOnlineSources = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    monomerLibraryPath: string;
}) => {

    const height = useSelector((state: moorhen.State) => state.canvasStates.height)

    return <div style={{maxHeight: convertViewtoPx(65, height), overflowY: 'auto', paddingBottom: '4rem'}}>
        <MoorhenFetchOnlineSourcesForm
            commandCentre={props.commandCentre}
            glRef={props.glRef}
            downloadMaps={false}
            sources={["PDBe", "AFDB"]}
            monomerLibraryPath={props.monomerLibraryPath}/>
    </div>
}
