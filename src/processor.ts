import {EvmBatchProcessor} from '@subsquid/evm-processor'
import {lookupArchive} from '@subsquid/archive-registry'
import * as erc20abi from './abi/erc20'
import {Database, LocalDest} from '@subsquid/file-store'
import {Column, Table, Types} from '@subsquid/file-store-parquet'

// USDC Transfer events
const processor = new EvmBatchProcessor()
	.setBlockRange({from: 6082465})
	.setDataSource({archive: lookupArchive('eth-mainnet')})
	.addLog('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', {
		filter: [[erc20abi.events.Transfer.topic]],
		data: {
			evmLog: { topics: true, data: true },
			transaction: { hash: true }
		} as const
	})

const dbOptions = {
	tables: {
		TransfersTable: new Table(
			'transfers.parquet',
			{
				from: Column(
					Types.String(),
					{
						compression: 'UNCOMPRESSED'
					}
				),
				to: Column(Types.String()),
				value: Column(Types.Uint64())
			},
			{
				compression: 'GZIP',
				rowGroupSize: 300000,
				pageSize: 1000
			}
		)
	},
	dest: new LocalDest('./data'),
	chunkSizeMb: 10,
	// Explicitly keeping the default value of syncIntervalBlocks (infinity).
	// Make sure to use a finite value here if your output data rate is low!
	syncIntervalBlocks: undefined
}

processor.run(new Database(dbOptions), async (ctx) => {
	for (let c of ctx.blocks) {
		for (let i of c.items) {
			if (i.kind==='evmLog') {
				let { from, to, value } = erc20abi.events.Transfer.decode(i.evmLog)
				ctx.store.TransfersTable.write({ from, to, value: value.toBigInt() })
			}
		}
	}
});
