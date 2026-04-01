import { PublicKey } from "@solana/web3.js";
export declare function deriveEscrowState(depositor: PublicKey, mint: PublicKey): [PublicKey, number];
export declare function deriveVault(escrowState: PublicKey): [PublicKey, number];
export declare function deriveConditionConfig(escrowState: PublicKey): [PublicKey, number];
export declare function deriveReleaseAuthority(conditionConfig: PublicKey): [PublicKey, number];
export declare function deriveGuardState(conditionConfig: PublicKey): [PublicKey, number];
export declare function deriveAllPDAs(depositor: PublicKey, mint: PublicKey): {
    escrowState: {
        address: PublicKey;
        bump: number;
    };
    vault: {
        address: PublicKey;
        bump: number;
    };
    conditionConfig: {
        address: PublicKey;
        bump: number;
    };
    releaseAuthority: {
        address: PublicKey;
        bump: number;
    };
    guardState: {
        address: PublicKey;
        bump: number;
    };
};
