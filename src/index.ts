import {
    AccountFetcher,
    buildWhirlpoolClient,
    increaseLiquidityQuoteByInputToken,
    PDAUtil,
    PriceMath,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ORCA_WHIRLPOOLS_CONFIG,
    swapQuoteByInputToken,
    WhirlpoolContext,
    collectFeesQuote,
    TickArrayUtil,
    TickUtil,
    SwapUtils,
    PoolUtil
} from "@orca-so/whirlpools-sdk"

import {clusterApiUrl, Connection, PublicKey } from "@solana/web3.js"
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet"
import { createKeypairFromFile } from './utils'
import Decimal from "decimal.js"
import {Percentage} from "@orca-so/common-sdk"
import BN from 'bn.js'

const KEY_FILE = '/Users/fzzyyti/.config/solana/id2.json'
const ORCA_MINT = 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const decDivider = Math.pow(10, 6)
const solDecDivider = Math.pow(10,9)

const main = async () => {
    const connection = new Connection(clusterApiUrl("mainnet-beta"))
    const keypair = await createKeypairFromFile(KEY_FILE)
    const wallet = new NodeWallet(keypair)
    const ctx = WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID)
    const fetcher = new AccountFetcher(connection)
    const orca = buildWhirlpoolClient(ctx, fetcher)

  //  const pos = await orca.getPosition(new PublicKey('2U6uehjEpDygXw8TaL2EiqvhwxGZEpy3vzawsV8wLQYT'))
   // const posData = await pos.getData();

  //  console.log(posData)
    //return

    const PROGRAM_ID = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc')
    const CONFIG = new PublicKey('FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR')


// Derive the Whirlpool address from token mints
    const poolAddress = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        ORCA_WHIRLPOOLS_CONFIG,
        new PublicKey(ORCA_MINT),
        new PublicKey(USDC_MINT), 64);
// Fetch an instance of the pool
    const pool = await orca.getPool(poolAddress.publicKey);
    if (!pool) {
        return;
    }
    const poolData = pool.getData();
    console.log('Pool liquidity',poolData.liquidity.toNumber());
    console.log('Orca price per USDC', PriceMath.sqrtPriceX64ToPrice(poolData.sqrtPrice, 6, 6));
// Open a position
    const upperLimitTick = PriceMath.priceToInitializableTickIndex(new Decimal(2),6,6, 64);
    const lowerLimitTick = PriceMath.priceToInitializableTickIndex(new Decimal(.1),6,6, 64);
    const positionQuote = increaseLiquidityQuoteByInputToken(
        ORCA_MINT,
        new Decimal(100),
        lowerLimitTick,
        upperLimitTick,
        Percentage.fromFraction(1,100),
        pool);
    const decDivider = Math.pow(10, 6);
    console.log('ORCA (Estimate) = ', (positionQuote.tokenEstA as BN).toNumber() / decDivider);
    console.log('ORCA (Max) = ', (positionQuote.tokenMaxA as BN).toNumber() / decDivider);
    console.log('USDC (Max) = ', (positionQuote.tokenMaxB as BN).toNumber() / decDivider);
    console.log('Liquidity = ', (positionQuote.liquidityAmount as BN).toNumber() / decDivider);
    const {positionMint, tx: positionTx} = await pool.openPosition(
        lowerLimitTick,
        upperLimitTick,
        {
            tokenMaxA: positionQuote.tokenMaxA,
            tokenMaxB: positionQuote.tokenMaxB,
            liquidityAmount: positionQuote.liquidityAmount
        });
 //   const positionTxId = positionTx.buildAndExecute();
 //   console.log('Position tx id', positionTxId);
// Construct a swap instruction on this pool and execute.
    const swapQuote = await swapQuoteByInputToken(
        pool,
        ORCA_MINT,
        new BN(100).mul(new BN(decDivider)),
        Percentage.fromFraction(1,100),
        ORCA_WHIRLPOOL_PROGRAM_ID,
        fetcher,
        false);
    console.log('ORCA in Amount estimate', (swapQuote.estimatedAmountIn as BN).toNumber() / decDivider);
    console.log('USDC out Amount estimate', (swapQuote.estimatedAmountOut as BN).toNumber() / decDivider);
    const swapTx = await pool.swap(swapQuote);
   // const swapTxId = await swapTx.buildAndExecute();
   // console.log('Swap tx id', swapTxId);


}

main()