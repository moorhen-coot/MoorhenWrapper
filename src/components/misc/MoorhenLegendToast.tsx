import { Form, Toast, ToastContainer } from 'react-bootstrap';
import { CloudSyncOutlined, NewReleasesOutlined } from '@mui/icons-material';
import { moorhen } from "moorhen/types/moorhen"
import { useSelector } from 'react-redux';

type MoorhenLegendToastPropsType = { 
    busyFetching: boolean;
    notifyNewContent: boolean;
    legendText: string | JSX.Element;
 }

export const MoorhenLegendToast = (props: MoorhenLegendToastPropsType) => {

    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const isDark = useSelector((state: moorhen.State) => state.canvasStates.isDark)

    return  <ToastContainer style={{ marginTop: "1rem", marginLeft: "0.5rem" }} position='top-start' >
                <Toast bg='light' onClose={() => {}} autohide={false} show={true}>
                    <Toast.Header closeButton={false} style={{justifyContent:'center'}}>
                        {props.busyFetching && 
                            <CloudSyncOutlined style={{marginRight: "0.1rem"}} sx={{color: isDark ? 'white' : 'grey'}}/>    
                        }
                        {props.notifyNewContent && 
                            <NewReleasesOutlined style={{marginRight: "0.1rem"}} sx={{color: isDark ? 'white' : 'grey'}}/>                        
                        }
                        {hoveredAtom.cid ? 
                            <Form.Control style={{ height: '2rem', width: "25rem" }} type="text" readOnly={true} value={`${hoveredAtom.molecule.name}:${hoveredAtom.cid}`}/>
                        :
                            <Form.Control style={{ height: '2rem', width: "25rem" }} type="text" readOnly={true} value={" "}/>
                        }
                    </Toast.Header>
                    <Toast.Body style={{backgroundColor: isDark ? '#444444' : 'white'}}>
                        {props.legendText}
                    </Toast.Body>
                </Toast>
            </ToastContainer>
}

