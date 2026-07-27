import * as erc20abi from './abi/erc20'
import {run} from '@subsquid/batch-processor'
import {augmentBlock} from '@subsquid/evm-objects'
import {DataSourceBuilder} from '@subsquid/evm-stream'
import {Database, LocalDest} from '@subsquid/file-store'
import {Column, Table, Types} from '@subsquid/file-store-parquet'

const USDC_CONTRACT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase()

// A DataSourceBuilder defines where to get the data and what data to fetch.
const dataSource = new DataSourceBuilder()
	// The SQD Network Portal is the primary source of blockchain data: it is public,
	// needs no API key, and streams pre-filtered data — including real-time unfinalized
	// blocks — far faster than a plain RPC endpoint.
	// Browse the available datasets at https://docs.sqd.ai/subsquid-network/reference/networks/
	.setPortal('https://portal.sqd.dev/datasets/ethereum-mainnet')
	// To use a private or rate-limit-lifted Portal, supply an API key
	// through the HTTP client headers (create a key at https://portal.sqd.dev/app):
	// .setPortal({
	//     url: 'https://portal.sqd.dev/datasets/ethereum-mainnet',
	//     http: {
	//         headers: {'x-api-key': process.env.SQD_API_KEY},
	//     },
	// })
	.setBlockRange({
		from: 6082465
	})
	// Field selection is explicit: there are no default fields, so list every field the
	// handler reads. See
	// https://docs.sqd.dev/en/sdk/squid-sdk/evm/reference/evm-stream/field-selection
	.setFields({
		log: {
			address: true,
			topics: true,
			data: true
		}
	})
	.addLog({
		where: {
			address: [USDC_CONTRACT],
			topic0: [erc20abi.events.Transfer.topic]
		}
	})
	.build()

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
	// More details here:
	// https://docs.sqd.dev/en/sdk/squid-sdk/evm/reference/data-stores/file-store
	syncIntervalBlocks: undefined
}

// run() drives the processing loop, passing each batch of data to the handler.
// Reading on-chain contract state (token balances, totalSupply, prices, …) during indexing
// means constructing an RpcClient and calling the squid-evm-typegen Contract classes — the
// Portal handler has no built-in chain access. How-to:
// https://docs.sqd.dev/en/sdk/squid-sdk/evm/reference/evm-typegen/direct-rpc-queries
run(dataSource, new Database(dbOptions), async (ctx) => {
	// augmentBlock() enriches raw block items with ids and navigation helpers.
	const blocks = ctx.blocks.map(augmentBlock)
	for (let block of blocks) {
		for (let log of block.logs) {
			if (log.address===USDC_CONTRACT && log.topics[0]===erc20abi.events.Transfer.topic) {
				let { from, to, value } = erc20abi.events.Transfer.decode(log)
				ctx.store.TransfersTable.write({ from, to, value })
			}
		}
	}
})
