# A squid that saves USDC Transfers to Parquet files

This tiny blockchain indexer scrapes `Transfer` events emitted by the [USDC contract](https://etherscan.io/address/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48) and saves the data in a file-based dataset in a local folder `./data`. It is built with the [Subsquid framework](https://sqd.dev), hence the term "squid".

The squid uses [`@subsquid/file-store`](https://docs.sqd.dev/en/sdk) and [`@subsquid/file-store-parquet`](https://docs.sqd.dev/en/sdk) packages to store the dataset. The result is a partitioned dataset where the data is stored in [Apache Parquet](https://parquet.apache.org) files.

Dependencies: NodeJS, [Squid CLI](https://docs.sqd.dev/en/sdk).

To see it in action, spin up a *processor*, a process that ingests the data from the Ethereum Archive:

```bash
git clone https://github.com/subsquid-labs/file-store-parquet-example
cd file-store-parquet-example/
npm i
sqd process
```
You should see a `./data` folder populated with indexer data appear in a bit:
```bash
$ tree ./data/
./data/
├── 0000000000-0007258859
│   └── transfers.parquet
├── 0007258860-0007671919
│   └── transfers.parquet
...
└── status.txt
```
