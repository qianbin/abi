import { AbiCoder, formatSignature as _formatSignature } from '@vechain/ethers/utils/abi-coder'
const keccak = require('keccak')

class Coder extends AbiCoder {
    constructor() {
        super((type, value) => {
            if ((type.match(/^u?int/) && !Array.isArray(value) && typeof value !== 'object') ||
                value._ethersType === 'BigNumber') {
                return value.toString()
            }
            return value
        })
    }

    public encode(types: string[], values: any[]): string {
        try {
            return super.encode(types, values)
        } catch (err) {
            if (err.reason) {
                throw new Error(err.reason)
            }
            throw err
        }
    }

    public decode(types: string[], data: string): any[] {
        try {
            return super.decode(types, data)
        } catch (err) {
            if (err.reason) {
                throw new Error(err.reason)
            }
            throw err
        }
    }
}

const coder = new Coder()

function formatSignature(fragment: any) {
    try {
        return _formatSignature(fragment)
    } catch (err) {
        if (err.reason) {
            throw new Error(err.reason)
        }
        throw err
    }
}

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

/** encode/decode parameters of contract function call, event log, according to ABI JSON */
export namespace abi {

    /**
     * encode single parameter
     * @param type type of the parameter
     * @param value value of the parameter
     * @returns encoded value in hex string
     */
    export function encodeParameter(type: string, value: any) {
        return coder.encode([type], [value])
    }

    /**
     * decode single parameter
     * @param type type of the parameter
     * @param data encoded parameter in hex string
     * @returns decoded value
     */
    export function decodeParameter(type: string, data: string) {
        return coder.decode([type], data)[0]
    }

    /**
     * encode a group of parameters
     * @param types type array
     * @param values value array
     * @returns encoded values in hex string
     */
    export function encodeParameters(types: Function.Parameter[], values: any[]) {
        return coder.encode(types.map(p => p.type), values)
    }

    /**
     * decode a group of parameters
     * @param types type array
     * @param data encoded values in hex string
     * @returns decoded object
     */
    export function decodeParameters(types: Function.Parameter[], data: string) {
        const result = coder.decode(types.map(p => p.type), data)
        const decoded: Decoded = {}
        types.forEach((t, i) => {
            decoded[i] = result[i]
            if (t.name) {
                decoded[t.name] = result[i]
            }
        })
        return decoded
    }

    /** for contract function */
    export class Function {
        /** canonical name */
        public readonly canonicalName: string

        /** the function signature, aka. 4 bytes prefix */
        public readonly signature: string

        /**
         * create a function object
         * @param definition abi definition of the function
         */
        constructor(public readonly definition: Function.Definition) {
            this.canonicalName = formatSignature(definition)
            this.signature = '0x' + keccak256(this.canonicalName).slice(0, 4).toString('hex')
        }

        /**
         * encode input parameters into call data
         * @param args arguments for the function
         */
        public encode(...args: any[]): string {
            return this.signature + encodeParameters(this.definition.inputs, args).slice(2)
        }

        /**
         * decode output data
         * @param outputData output data to decode
         */
        public decode(outputData: string) {
            return decodeParameters(this.definition.outputs, outputData)
        }
    }

    export namespace Function {
        export type StateMutability = 'pure' | 'view' | 'constant' | 'payable' | 'nonpayable'
        export interface Parameter {
            name: string
            type: string
        }

        export interface Definition {
            type: 'function'
            name: string
            constant?: boolean
            payable: boolean
            stateMutability: StateMutability
            inputs: Parameter[]
            outputs: Parameter[]
        }
    }

    /** for contract event */
    export class Event {
        /** canonical name */
        public readonly canonicalName: string

        /** the event signature */
        public readonly signature: string

        /** for contract event */
        constructor(public readonly definition: Event.Definition) {
            this.canonicalName = formatSignature(definition)
            this.signature = '0x' + keccak256(this.canonicalName).toString('hex')
        }

        /**
         * encode an object of indexed keys into topics.
         * @param indexed an object contains indexed keys
         */
        public encode(indexed: object): Array<string | null> {
            const topics: Array<string | null> = []
            if (!this.definition.anonymous) {
                topics.push(this.signature)
            }
            for (const input of this.definition.inputs) {
                if (!input.indexed) {
                    continue
                }
                const value = (indexed as any)[input.name]
                if (value === undefined || value === null) {
                    topics.push(null)
                } else {
                    let topic
                    if (isDynamicType(input.type)) {
                        if (input.type === 'string') {
                            topic = '0x' + keccak256(value).toString('hex')
                        } else {
                            if (typeof value === 'string' && /^0x[0-9a-f]+$/i.test(value) && value.length % 2 === 0) {
                                topic = '0x' + keccak256(Buffer.from(value.slice(2), 'hex')).toString('hex')
                            } else {
                                throw new Error(`invalid ${input.type} value`)
                            }
                        }
                    } else {
                        topic = encodeParameter(input.type, value)
                    }
                    topics.push(topic)
                }
            }
            return topics
        }

        /**
         * decode event log
         * @param data data in event output
         * @param topics topics in event
         */
        public decode(data: string, topics: string[]) {
            if (!this.definition.anonymous) {
                topics = topics.slice(1)
            }

            if (this.definition.inputs.filter(t => t.indexed).length !== topics.length) {
                throw new Error('invalid topics count')
            }

            const decodedNonIndexed = coder.decode(
                this.definition.inputs.filter(t => !t.indexed).map(t => t.type), data)

            const decoded: Decoded = {}
            this.definition.inputs.forEach((t, i) => {
                if (t.indexed) {
                    const topic = topics.shift()!
                    decoded[i] = isDynamicType(t.type) ?
                        topic : decodeParameter(t.type, topic)
                } else {
                    decoded[i] = decodedNonIndexed.shift()
                }
                if (t.name) {
                    decoded[t.name] = decoded[i]
                }
            })
            return decoded
        }
    }

    export namespace Event {
        export interface Parameter {
            name: string
            type: string
            indexed: boolean
        }

        export interface Definition {
            type: 'event'
            name: string
            anonymous?: boolean
            inputs: Parameter[]
        }
    }

    export type Decoded = { [name: string]: any } & { [index: number]: any }

    function isDynamicType(type: string) {
        return type === 'bytes' || type === 'string' || type.endsWith('[]')
    }
}
