import type { moorhen } from "moorhen/types/moorhen.d.ts"

export class MoorhenAceDRGInstance implements moorhen.AceDRGInstance {
    createCovalentLink: (atomOneFormData: moorhen.createCovLinkAtomInput, atomTwoFormData: moorhen.createCovLinkAtomInput) => void;

    constructor() {
        this.createCovalentLink = (atomOneFormData: moorhen.createCovLinkAtomInput, atomTwoFormData: moorhen.createCovLinkAtomInput) => { }
    }

}