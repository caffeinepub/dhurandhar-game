import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface backendInterface {
    getLeaderboard(): Promise<Array<[string, bigint]>>;
    /**
     * / Submit a new high score with player's name and score.
     * / If the score is higher than the existing one or if player has no score yet,
     * / it replaces the previous score.
     */
    submitScore(name: string, score: bigint): Promise<void>;
}
