import { expect } from 'chai'
import { abi } from '../src'
const keccak = require('keccak')

function keccak256(...data: Array<Buffer | string>) {
    const h = keccak('keccak256')
    data.forEach(d => {
        if (Buffer.isBuffer(d)) {
            h.update(d)
        } else {
            h.update(Buffer.from(d, 'utf8'))
        }
    })
    return h.digest() as Buffer
}
// tslint:disable:quotemark
// tslint:disable:object-literal-key-quotes
// tslint:disable:max-line-length
// tslint:disable:trailing-comma

describe('abi', () => {

    // contract Foo {
    //     function f1(uint a1, string a2) public returns(address r1, bytes r2);
    //     event E1(uint indexed a1, string a2);
    //     event E2(uint indexed a1, string a2) anonymous;
    // }
    const f1 = new abi.Function({
        "constant": false,
        "inputs": [
            {
                "name": "a1",
                "type": "uint256"
            },
            {
                "name": "a2",
                "type": "string"
            }
        ],
        "name": "f1",
        "outputs": [
            {
                "name": "r1",
                "type": "address"
            },
            {
                "name": "r2",
                "type": "bytes"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    })

    const e1 = new abi.Event({
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "a1",
                "type": "uint256"
            },
            {
                "indexed": false,
                "name": "a2",
                "type": "string"
            }
        ],
        "name": "E1",
        "type": "event"
    })

    const e2 = new abi.Event({
        "anonymous": true,
        "inputs": [
            {
                "indexed": true,
                "name": "a1",
                "type": "uint256"
            },
            {
                "indexed": false,
                "name": "a2",
                "type": "string"
            }
        ],
        "name": "E2",
        "type": "event"
    })

    const e3 = new abi.Event({
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "a1",
                "type": "uint256"
            }
        ],
        "name": "E3",
        "type": "event"
    })
    const e4 = new abi.Event({
        "inputs": [
            {
                "indexed": true,
                "name": "a1",
                "type": "string"
            }
        ],
        "name": "E4",
        "type": "event"
    })
    it('codec', () => {
        expect(abi.encodeParameter('uint256', '2345675643')).equal('0x000000000000000000000000000000000000000000000000000000008bd02b7b')
        expect(() => abi.encodeParameter('bytes32', '0xdf3234')).to.throw()

        expect(abi.encodeParameter('bytes32', '0xdf32340000000000000000000000000000000000000000000000000000000000')).equal('0xdf32340000000000000000000000000000000000000000000000000000000000')
        expect(abi.encodeParameter('bytes', '0xdf3234')).equal('0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003df32340000000000000000000000000000000000000000000000000000000000')
        expect(abi.encodeParameter('uint256', '2345675643')).equal('0x000000000000000000000000000000000000000000000000000000008bd02b7b')
        expect(abi.encodeParameter('bytes32[]', ['0xdf32340000000000000000000000000000000000000000000000000000000000', '0xfdfd000000000000000000000000000000000000000000000000000000000000'])).equal('0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002df32340000000000000000000000000000000000000000000000000000000000fdfd000000000000000000000000000000000000000000000000000000000000')

        expect(abi.decodeParameter('uint256', '0x0000000000000000000000000000000000000000000000000000000000000010')).equal("16")
        expect(abi.decodeParameter('string', '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000848656c6c6f212521000000000000000000000000000000000000000000000000'))
            .equal("Hello!%!")
        expect(abi.decodeParameter('string', '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000848656c6c6f212521000000000000000000000000000000000000000000000000'))
            .equal("Hello!%!")

    })

    it('function', () => {
        expect(f1.signature).equal('0x27fcbb2f')
        expect(f1.encode(1, 'foo')).equal('0x27fcbb2f000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000003666f6f0000000000000000000000000000000000000000000000000000000000')
        expect(f1.decode('0x000000000000000000000000abc000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000003666f6f0000000000000000000000000000000000000000000000000000000000')).deep.equal({
            0: '0xabc0000000000000000000000000000000000001',
            1: '0x666f6f',
            r1: '0xabc0000000000000000000000000000000000001',
            r2: '0x666f6f'
        })
    })

    it('event', () => {
        expect(e1.signature).equal('0x47b78f0ec63d97830ace2babb45e6271b15a678528e901a9651e45b65105e6c2')
        expect(e1.decode(
            '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003666f6f0000000000000000000000000000000000000000000000000000000000',
            [
                '0x47b78f0ec63d97830ace2babb45e6271b15a678528e901a9651e45b65105e6c2',
                '0x0000000000000000000000000000000000000000000000000000000000000001'
            ]))
            .deep.equal({
                "0": "1",
                "1": "foo",
                "a1": "1",
                "a2": "foo",
            })

        expect(e2.decode('0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003666f6f0000000000000000000000000000000000000000000000000000000000',
            ['0x0000000000000000000000000000000000000000000000000000000000000001']))
            .deep.equal({
                "0": "1",
                "1": "foo",
                "a1": "1",
                "a2": "foo",
            })


        expect(e1.encode({}))
            .deep.equal([
                '0x47b78f0ec63d97830ace2babb45e6271b15a678528e901a9651e45b65105e6c2',
                null
            ])

        expect(e1.encode({ a1: 1 }))
            .deep.equal([
                '0x47b78f0ec63d97830ace2babb45e6271b15a678528e901a9651e45b65105e6c2',
                '0x0000000000000000000000000000000000000000000000000000000000000001'
            ])

        expect(e1.encode({ a1: 1, x: 3 }))
            .deep.equal([
                '0x47b78f0ec63d97830ace2babb45e6271b15a678528e901a9651e45b65105e6c2',
                '0x0000000000000000000000000000000000000000000000000000000000000001'
            ])
        expect(e2.encode({ a1: 1 }))
            .deep.equal([
                '0x0000000000000000000000000000000000000000000000000000000000000001'
            ])

        expect(e3.encode({ a1: 1 }))
            .deep.equal([
                '0xe96585649d926cc4f5031a6113d7494d766198c0ac68b04eb93207460f9d7fd2',
                '0x0000000000000000000000000000000000000000000000000000000000000001'
            ])

        expect(e3.decode('0x0',
            ['0xe96585649d926cc4f5031a6113d7494d766198c0ac68b04eb93207460f9d7fd2',
                '0x0000000000000000000000000000000000000000000000000000000000000001']))
            .deep.equal({
                "0": "1",
                "a1": "1",
            })

        const preimage = 'hello'
        const hash = '0x' + keccak256('hello').toString('hex')
        expect(e4.encode({ a1: preimage })).deep.equal([e4.signature, hash])
        expect(e4.decode('0x', [e4.signature, hash])).deep.equal({
            0: hash,
            a1: hash
        })
    })
})
