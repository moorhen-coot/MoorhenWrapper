import { moorhen } from "moorhen/types/moorhen"

export class MoorhenAceDRGInstance implements moorhen.AceDRGInstance {
    createCovalentLink: (atomOneFormData: moorhen.createCovLinkAtomInput, atomTwoFormData: moorhen.createCovLinkAtomInput) => void;

    constructor() {
        this.createCovalentLink = (atomOneFormData: moorhen.createCovLinkAtomInput, atomTwoFormData: moorhen.createCovLinkAtomInput) => { }
    }

}