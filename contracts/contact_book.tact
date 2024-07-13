import "@stdlib/ownable";

message AddContactMessage {
    address: Address;
}
message RemoveContactMessage {
    address: Address;
}

message SendToContactMessage {
    to: Address;
    body: Cell;
}

message BroadcastMessage {
    comment: String;
    value: Int as coins;
}

contract ContactBook with Ownable {
    const GasConsumption: Int = ton("0.05");
    const GasPerUser: Int = ton("0.006");

    owner: Address;
    book: map<Address, Int as uint16>;
    length: Int as uint8;
    // Empty init() function is present by default in all Tact contracts
    // since v1.3.0, so the following may be omitted:
    //
    init(owner: Address, book: map<Address, Int as uint16>, length: Int) {
        self.owner = owner;
        self.book = book;
        self.length = length;
    }

    receive(msg: AddContactMessage) {
        self.requireOwner();

        let deleted: Bool = self.book.del(msg.address);
        require(deleted == false, "Already in book");
        self.book.set(msg.address, 0);
        self.length += 1;
        self.reply("Added".asComment());
    }
    receive(msg: RemoveContactMessage) {
        self.requireOwner();

        let deleted: Bool = self.book.del(msg.address);
        require(deleted, "Not in book");
        self.length -= 1;
        self.reply("Removed".asComment());
    }

    receive(msg: SendToContactMessage) {
        self.requireOwner();

        let stat: Int = self.book.get(msg.to)!!;
        // require(stat != null, "Not in book");
        self.forward(msg.to, msg.body, false, null);
        self.book.set(msg.to, stat + 1);
    }

    receive(str: String) {
        let sender: Address = context().sender;
        let stat: Int = self.book.get(sender)!!;
        self.forward(self.owner, str.asComment(), false, null);
    }

    receive(msg: BroadcastMessage) {
        self.requireOwner();
        let val: Int = context().value;
        require(val > self.GasConsumption + (self.GasPerUser + msg.value) * self.length, "Not enough value");
        let body: Cell = msg.comment.asComment();
        foreach(key, stat in self.book) {
            send(SendParameters{
                to: key,
                value: msg.value,
                body: body,
                bounce: false
            });
            self.book.set(key, stat + 1);
        }
    }

    receive() {}

    get fun address_stat(addr: Address): Int? {
        return self.book.get(addr);
    }
}
