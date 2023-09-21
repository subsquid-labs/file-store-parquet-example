import * as erc20abi from './abi/erc20'
import {Database, LocalDest} from '@subsquid/file-store'
import {Column, Table, Types} from '@subsquid/file-store-parquet'

import {processor, USDC_CONTRACT} from './processor'

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
	for (let block of ctx.blocks) {
		for (let log of block.logs) {
			if (log.address===USDC_CONTRACT && log.topics[0]===erc20abi.events.Transfer.topic) {
				let { from, to, value } = erc20abi.events.Transfer.decode(log)
				ctx.store.TransfersTable.write({ from, to, value })
			}
		}
	}
})
