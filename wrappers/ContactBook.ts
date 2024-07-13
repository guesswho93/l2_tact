import { Address, Dictionary } from '@ton/core';

export * from '../build/ContactBook/tact_ContactBook';


export function createBook(list: Address[]) {
    let dict: Dictionary<Address, number> = Dictionary.empty();
    for(let addr of list) {
        dict.set(addr, 0);
    }
    return dict;
}