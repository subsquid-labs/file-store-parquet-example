import {EvmBatchProcessor} from '@subsquid/evm-processor'
import {lookupArchive} from '@subsquid/archive-registry'
import * as erc20abi from './abi/erc20'

export const USDC_CONTRACT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase()

export const processor = new EvmBatchProcessor()
	.setBlockRange({
		from: 6082465
	})
	.setDataSource({
		archive: lookupArchive('eth-mainnet')
	})
	.addLog({
		address: [USDC_CONTRACT],
		topic0: [erc20abi.events.Transfer.topic]
	})
