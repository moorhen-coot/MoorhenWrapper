import { useState, useEffect, useRef, useCallback } from "react";
import { Form, FormSelect, Spinner } from "react-bootstrap";
import { useSelector } from "react-redux";
import { Backdrop } from "@mui/material";
import { findConsecutiveRanges } from "../../utils/utils";
import { MoorhenDraggableModalBase, MoorhenMoleculeSelect, getMoleculeBfactors, MoorhenSlider } from "moorhen";
import { moorhen } from "moorhen/types/moorhen";

export const MoorhenSliceNDiceModal = (props: {
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const moleculeSelectRef = useRef<HTMLSelectElement>(null)
    const bFactorList = useRef<{ cid: string; bFactor: number; chainId: string; resNum: number; modelName: string }[]>([])
    const timerRef = useRef<any>(null);
    const cachedThresholdValue = useRef<number | null>(null);
    const cachedTresholdType = useRef<string | null>(null);

    const [thresholdValue, setThresholdValue] = useState<number>(50)
    const [thresholdType, setThresholdType] = useState<string>('B-Factor')
    const [minMaxSliderValues, setMinMaxSliderValues] = useState<[number, number]>([1, 100])
    const [selectedModel, setSelectedModel] = useState<number | null>(null)
    const [busy, setBusy] = useState<boolean>(false)

    const width = useSelector((state: moorhen.State) => state.canvasStates.width)
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const getMinMaxBFactor = (molecule: moorhen.Molecule): [number, number] => {
        const gemmiStruct = molecule.gemmiStructure.clone()
        const bFactors = getMoleculeBfactors(gemmiStruct)
        bFactorList.current = bFactors
        const min = parseInt(Math.min(...bFactors.map(item => item.bFactor)).toFixed(1))
        const max = parseInt(Math.max(...bFactors.map(item => item.bFactor)).toFixed(1))
        return [min, max]
    }

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))
    }

    const handleThresholdTypeChange = (evt: React.ChangeEvent<HTMLSelectElement>) => { 
        setThresholdType(evt.target.value) 
        if (evt.target.value === 'B-Factor') {
            const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
            if (selectedMolecule) {
                setMinMaxSliderValues( getMinMaxBFactor(selectedMolecule) )
            }
        } else {
            setMinMaxSliderValues([1, 100])
        }
    }

    useEffect(() => {
        if (selectedModel !== null && thresholdType === 'B-Factor') {
            const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
            if (selectedMolecule) {
                setMinMaxSliderValues( getMinMaxBFactor(selectedMolecule) )
            }
        }
    }, [selectedModel])

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(molecules[0].molNo)
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(molecules[0].molNo)
        }
    }, [molecules.length])
    
    const applyThreshold = useCallback(async (cutoff: number, cutoffType: string) => {
        if (cutoff !== thresholdValue || cutoffType !== thresholdType) {
            // User didn't finish moving the slider...
            return
        }
        if (selectedModel !== null) {
            const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
            if (selectedMolecule) {
                setBusy(true)
                await selectedMolecule.unhideAll(false)
                let toHideMolecule: { cid: string; bFactor: number; chainId: string; resNum: number; modelName: string }[] = []
                if (cutoffType === 'B-Factor') {
                    toHideMolecule = bFactorList.current.filter(item => item.bFactor >= cutoff)
                } else {
                    toHideMolecule = bFactorList.current.filter(item => item.bFactor <= cutoff)                        
                }
                let hidePromises = []
                selectedMolecule.sequences.forEach(sequence => {
                    const toHideChain = toHideMolecule.filter(item => item.chainId === sequence.chain)
                    const residueRanges = findConsecutiveRanges(toHideChain.map(item => item.resNum))
                    residueRanges.forEach(range => {
                        hidePromises.push(
                            selectedMolecule.hideCid(`//${sequence.chain}/${range[0]}-${range[1]}/*`, false)
                        )
                    })
                })
                await Promise.all(hidePromises)
                await selectedMolecule.redraw()
                setBusy(false)
            }
        }    
    }, [selectedModel, molecules, thresholdType, thresholdValue])

    useEffect(() => {
        cachedThresholdValue.current = thresholdValue
        cachedTresholdType.current = thresholdType
        timerRef.current = setTimeout(() => {
            applyThreshold(cachedThresholdValue.current, cachedTresholdType.current);
        }, 1000);

    }, [thresholdValue, thresholdType])

    const panelContent = <>
        <MoorhenMoleculeSelect ref={moleculeSelectRef} molecules={molecules} onChange={handleModelChange} width='100%' />
        
        <Form.Group key="thresholdType" style={{ width: '100%', margin: '0.5rem' }} controlId="thresholdType" className="mb-3">
            <Form.Label>Value</Form.Label>
            <FormSelect size="sm" value={thresholdType} onChange={handleThresholdTypeChange}>
                <option key={'B-Factor'} value={'B-Factor'}>B-Factor</option>
                <option key={'PLDDT'} value={'PLDDT'}>PLDDT</option>
            </FormSelect>
        </Form.Group>

        <MoorhenSlider 
            sliderTitle={`${thresholdType} threshold`}
            logScale={false}
            minVal={minMaxSliderValues[0]}
            maxVal={minMaxSliderValues[1]}
            initialValue={thresholdValue}
            externalValue={thresholdValue}
            setExternalValue={setThresholdValue} />
    </>

    return <MoorhenDraggableModalBase
                left={`${width / 2}px`}
                show={props.show}
                setShow={props.setShow}
                height={70}
                width={20}
                headerTitle={"Slice-n-Dice"}
                body={panelContent}
                footer={null}
                additionalChildren={
                    <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={busy}>
                        <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
                        <span>Calculating...</span>
                    </Backdrop>
                }        
            />
}

