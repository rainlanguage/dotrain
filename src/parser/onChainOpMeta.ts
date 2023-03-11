import { gql, GraphQLClient } from 'graphql-request';
import { decodeRainMetaDocument, hexlify, isBigNumberish, MAGIC_NUMBERS } from "../utils";

/**
 * @public Subgraph endpoints and their chain ids as key/value pairs
 */
export const sgBook: {
    [chainId: number]: string
} = {
    0x80001: "https://api.thegraph.com/subgraphs/name/rainprotocol/interpreter-registry",
};

/**
 * @public Get the query content
 * @param address - Address of the deployer
 * @returns The query
 */
export const getQuery = (address: string): string => {
    if (address.match(/^0x[a-fA-F0-9]{40}$/)) {
        return gql`query MyQuery {
    expressionDeployer(id: "${address.toLowerCase()}") {
        meta
    }
}`;} 
    else throw new Error("invalid address");
};

/**
 * @public Get the op meta from sg
 * @param deployerAddress - The address of the deployer to get the op met from its emitted DISpair event
 * @param chainId - The chain id of the network where the deployer is deployed at. default is Mumbai network
 * @returns The op meta bytes
 */
export async function getOpMetaFromSg(
    deployerAddress: string, 
    chainId?: number
): Promise<string>;

/**
 * @public Get the op meta from sg
 * @param deployerAddress - The address of the deployer to get the op met from its emitted DISpair event
 * @param sgUrl - The subgraph endpoint URL to query from
 * @returns The op meta bytes
 */
export async function getOpMetaFromSg(
    deployerAddress: string, 
    sgUrl: string
): Promise<string>;

export async function getOpMetaFromSg(
    deployerAddress: string, 
    source: number | string = 0x80001
): Promise<string> {
    const _query = getQuery(deployerAddress);
    const _sgEndpointURL = isBigNumberish(source) 
        ? sgBook[Number(source)] 
        : (source as string).startsWith("https://api.thegraph.com/subgraphs/name/")
            ? source as string
            : "";
    if (!_sgEndpointURL) throw new Error("invalid subgraph endpoint URL");
    const graphQLClient = new GraphQLClient(_sgEndpointURL, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const _response = (await graphQLClient.request(_query)) as any;
    if (_response?.expressionDeployer?.meta) {
        const _bytes = decodeRainMetaDocument(_response.expressionDeployer.meta)?.find(
            v => v.get(1) === MAGIC_NUMBERS.OPS_META_V1
        )?.get(0);
        if (_bytes) return hexlify(_bytes);
        else throw new Error("cannot decode the opmeta");
    }
    else throw new Error("could not fetch the data from subgraph");
}
