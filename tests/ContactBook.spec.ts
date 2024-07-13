import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, comment, Dictionary, toNano } from '@ton/core';
import { ContactBook, createBook } from '../wrappers/ContactBook';
import '@ton/test-utils';
import { randomAddress } from '@ton/test-utils';

function randAddressList(len: number) {
    let list: Address[] = [];
    for (let index = 0; index < len; index++) {
        list.push(randomAddress());
    }
    return list;
}

function randomBook(len: number) {
    return createBook(randAddressList(len));
}

describe('ContactBook', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let contactBook: SandboxContract<ContactBook>;
    let list: Address[];
    let dict: Dictionary<Address, number>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');

        list = randAddressList(10)
        dict = createBook(list)

        contactBook = blockchain.openContract(await ContactBook.fromInit(deployer.address, dict, 10n));

        const deployResult = await contactBook.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: contactBook.address,
            deploy: true,
            success: true,
        });
    });

    it('should add/remove addresses', async () => {
        let user = await blockchain.treasury('user');
        expect(await contactBook.getAddressStat(user.address)).toBeNull();
        let res = await contactBook.send(deployer.getSender(), {value: toNano("0.05")}, {$$type: "AddContactMessage", address: user.address})
        expect(res.transactions).toHaveTransaction({
            to: contactBook.address,
            success: true
        })
        expect(await contactBook.getAddressStat(user.address)).toEqual(0n);
        res = await contactBook.send(deployer.getSender(), {value: toNano("0.05")}, {$$type: "RemoveContactMessage", address: user.address})
        expect(await contactBook.getAddressStat(user.address)).toBeNull();
    });

    it("should broadcast", async () => {
        let res = await contactBook.send(deployer.getSender(), {value: toNano("11")}, {$$type: "BroadcastMessage", comment: "Hello", value: toNano(1)})
        printTransactionFees(res.transactions);
        for(let addr of list) {
            expect(res.transactions).toHaveTransaction({
                to: addr,
                from: contactBook.address,
                body: comment("Hello")
            })
            expect(await contactBook.getAddressStat(addr)).toEqual(1n);
        }
    })

    it('should send a message to a contact', async () => {
        let user = await blockchain.treasury('user');
        
        await contactBook.send(deployer.getSender(), {value: toNano("0.05")}, {$$type: "AddContactMessage", address: user.address});
        expect(await contactBook.getAddressStat(user.address)).toEqual(0n);
    
        let messageBody = comment("its a test message");
        let res = await contactBook.send(deployer.getSender(), {value: toNano("0.05")}, {$$type: "SendToContactMessage", to: user.address, body: messageBody});
        expect(res.transactions).toHaveTransaction({
            to: user.address,
            from: contactBook.address,
            body: messageBody
        });
    
        expect(await contactBook.getAddressStat(user.address)).toEqual(1n);
    });

    it('should forward a message to the owner', async () => {
        let user = await blockchain.treasury('user');
        
        await contactBook.send(deployer.getSender(), {value: toNano("0.05")}, {$$type: "AddContactMessage", address: user.address});
        expect(await contactBook.getAddressStat(user.address)).toEqual(0n);
    
        let messageBody = "hello owner";
        let res = await contactBook.send(user.getSender(), {value: toNano("0.05")}, messageBody);
        expect(res.transactions).toHaveTransaction({
            to: contactBook.address,
            from: user.address,
            body: comment(messageBody)
        });
    
        expect(res.transactions).toHaveTransaction({
            to: deployer.address,
            from: contactBook.address,
            body: comment(messageBody)
        });
    });

});
